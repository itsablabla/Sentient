import os
import asyncpg
import asyncio
from dotenv import load_dotenv
from typing import Dict

from fastmcp.utilities.logging import get_logger

# Load .env file for 'dev-local' environment.
ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev-local')
if ENVIRONMENT == 'dev-local':
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)

logger = get_logger(__name__)

# Supabase direct Postgres connection (memory tables live in Supabase; schema via migrations).
# Accept SUPABASE_DB_URL or DATABASE_URL. Local: npx supabase status → Database URL.
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

# Embedding dimensions based on the chosen model.
# Google's gemini-embedding-001 can be truncated. We are using 768.
# See: https://ai.google.dev/gemini-api/docs/embeddings#controlling_embedding_size
EMBEDDING_DIM = 768

# Dictionary to store connection pools, keyed by the event loop they belong to.
_pools: Dict[asyncio.AbstractEventLoop, asyncpg.Pool] = {}
_db_setup_lock = asyncio.Lock()

async def get_db_pool() -> asyncpg.Pool:
    """Initializes and returns a singleton PostgreSQL connection pool for the current event loop (Supabase DB)."""
    global _pools
    loop = asyncio.get_running_loop()

    pool = _pools.get(loop)

    async with _db_setup_lock:
        if pool is None or pool.is_closing():
            if not SUPABASE_DB_URL or not SUPABASE_DB_URL.strip():
                raise ValueError(
                    "Neither SUPABASE_DB_URL nor DATABASE_URL is set. Set one to your Supabase Postgres "
                    "connection string (e.g. from 'npx supabase status' for local, or Project Settings > Database for hosted)."
                )
            logger.info(f"Initializing Supabase DB connection pool for memory on event loop {id(loop)}.")
            try:
                pool = await asyncpg.create_pool(SUPABASE_DB_URL.strip(), min_size=1, max_size=10)
                _pools[loop] = pool
                logger.info("Supabase DB connection pool for memory initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to create Supabase DB connection pool: {e}", exc_info=True)
                raise
        else:
            logger.debug(f"Returning existing Supabase DB connection pool for event loop {id(loop)}.")
    return pool

async def close_db_pool_for_loop(loop: asyncio.AbstractEventLoop):
    """Closes the connection pool associated with a specific event loop and removes it from the global dict."""
    global _pools
    pool = _pools.pop(loop, None)
    if pool:
        if not pool.is_closing():
            logger.info(f"Closing Supabase DB pool for event loop {id(loop)}.")
            await pool.close()
        else:
            logger.debug(f"Pool for event loop {id(loop)} was already closing.")

async def close_db_pool():
    """Closes all Supabase DB connection pools managed by this module."""
    global _pools
    if _pools:
        logger.info("Closing Supabase DB connection pools for memory.")
        for loop, pool in list(_pools.items()):
            if not pool.is_closing():
                await pool.close()
            del _pools[loop]
    else:
        logger.debug("No Supabase DB connection pools to close.")
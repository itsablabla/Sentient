import os
import logging
import asyncpg
from dotenv import load_dotenv

# Main server memories API uses the same Supabase DB as the Memory MCP (facts/topics tables).

logger = logging.getLogger(__name__)

# --- Environment Loading ---
ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev-local')
if ENVIRONMENT == 'dev-local':
    server_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dotenv_local_path = os.path.join(server_root, '.env.local')
    dotenv_path = os.path.join(server_root, '.env')
    load_path = dotenv_local_path if os.path.exists(dotenv_local_path) else dotenv_path
    if os.path.exists(load_path):
        load_dotenv(dotenv_path=load_path)
elif ENVIRONMENT == 'selfhost':
    server_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    dotenv_path = os.path.join(server_root, '.env.selfhost')
    load_dotenv(dotenv_path=dotenv_path)

# Supabase direct Postgres URL (same as Memory MCP). Accept SUPABASE_DB_URL or DATABASE_URL.
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

_pool: asyncpg.Pool = None

async def get_db_pool() -> asyncpg.Pool:
    """Initializes and returns a singleton Supabase DB connection pool for the memories API."""
    global _pool
    if _pool is None:
        if not SUPABASE_DB_URL or not SUPABASE_DB_URL.strip():
            raise ValueError(
                "Neither SUPABASE_DB_URL nor DATABASE_URL is set. Set one to your Supabase Postgres connection string."
            )
        logger.info("Initializing Supabase DB connection pool for memories API...")
        try:
            _pool = await asyncpg.create_pool(SUPABASE_DB_URL.strip(), min_size=1, max_size=10)
            logger.info("Supabase DB connection pool for memories API initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to create Supabase DB connection pool: {e}", exc_info=True)
            raise
    return _pool

async def close_db_pool():
    """Closes the Supabase DB connection pool."""
    global _pool
    if _pool is not None:
        logger.info("Closing Supabase DB connection pool for memories API.")
        await _pool.close()
        _pool = None
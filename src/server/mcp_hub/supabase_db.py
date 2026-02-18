# mcp_hub/supabase_db.py
# Shared Supabase client for all MCP servers.
# Replaces the old motor/MongoDB pattern.

import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load .env file for 'dev-local' environment.
ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev-local')
if ENVIRONMENT == 'dev-local':
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path, override=True)

from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


class SupabaseUsersCollection:
    """
    Drop-in replacement for the old MongoDB `users_collection`.
    Provides an async-compatible `find_one` method that queries
    the Supabase `user_profiles` table.
    """

    async def find_one(self, filter_dict: Dict[str, Any], projection: Optional[Dict] = None) -> Optional[Dict]:
        """
        Mimics MongoDB's find_one for user_profiles.
        Supports filter by user_id and optional field projection.
        """
        client = get_supabase_client()
        user_id = filter_dict.get("user_id")
        if not user_id:
            return None

        # Build select columns from projection if provided
        select_cols = "*"
        if projection:
            # MongoDB projection: {field: 1} means include
            cols = set()
            for key in projection:
                # Map dot-notation like "userData.personalInfo" to the JSONB column
                top_key = key.split(".")[0]
                if top_key == "userData":
                    cols.add("user_data")
                else:
                    cols.add(top_key)
            cols.add("user_id")  # Always include user_id
            select_cols = ",".join(cols)

        result = client.table("user_profiles").select(select_cols).eq("user_id", user_id).maybe_single().execute()
        doc = result.data
        if not doc:
            return None

        # Map user_data -> userData for backward compatibility with MCP auth code
        if "user_data" in doc:
            doc["userData"] = doc.pop("user_data")

        return doc


class SupabaseTasksCollection:
    """
    Drop-in replacement for the old MongoDB `tasks_collection`.
    Provides async-compatible query methods for the Supabase `tasks` table.
    """

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict]:
        client = get_supabase_client()
        query = client.table("tasks").select("*")
        for key, value in filter_dict.items():
            query = query.eq(key, value)
        result = query.maybe_single().execute()
        return result.data

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]) -> bool:
        client = get_supabase_client()
        update_data = update_dict.get("$set", update_dict)
        query = client.table("tasks").update(update_data)
        for key, value in filter_dict.items():
            query = query.eq(key, value)
        result = query.execute()
        return len(result.data) > 0 if result.data else False


# Singleton instances
users_collection = SupabaseUsersCollection()
tasks_collection = SupabaseTasksCollection()

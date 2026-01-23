import asyncio
import os
import motor.motor_asyncio
import asyncpg
from dotenv import load_dotenv

# Load environment variables
server_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# Prioritize local .env because we are running this script from the host/executor, not inside the selfhost container.
dotenv_path = os.path.join(server_root, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
elif os.path.exists(os.path.join(server_root, '.env.selfhost')):
    load_dotenv(dotenv_path=os.path.join(server_root, '.env.selfhost'))

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

TARGET_USER_ID = "sentient-user"

async def migrate_mongo():
    print("--- Starting MongoDB Migration ---")
    if not MONGO_URI or not MONGO_DB_NAME:
        print("MongoDB config missing. Skipping.")
        return

    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]

    collections_to_migrate = [
        "tasks",
        "messages",
        "notifications",
        "daily_usage",
        "monthly_usage",
        "processed_items_log"
    ]

    # 1. Migrate Collections (Simple Update)
    for col_name in collections_to_migrate:
        print(f"Migrating {col_name}...")
        result = await db[col_name].update_many(
            {"user_id": {"$ne": TARGET_USER_ID}},
            {"$set": {"user_id": TARGET_USER_ID}}
        )
        print(f"  Updated {result.modified_count} documents in {col_name}.")

    # 2. Migrate User Profile
    # We need to be careful with unique index on user_id in user_profiles
    print("Migrating user_profiles...")
    profiles_col = db["user_profiles"]
    
    # Check if target user already exists
    target_profile = await profiles_col.find_one({"user_id": TARGET_USER_ID})
    
    if target_profile:
        print(f"  Target user '{TARGET_USER_ID}' profile already exists. Merging/Overwriting is complex, skipping profile migration. Ensure you are happy with the existing '{TARGET_USER_ID}' profile.")
    else:
        # Find the most recently active user to migrate
        source_profile = await profiles_col.find_one(
            {"user_id": {"$ne": TARGET_USER_ID}},
            sort=[("last_updated", -1)]
        )
        
        if source_profile:
            old_id = source_profile["user_id"]
            print(f"  Migrating profile from '{old_id}' to '{TARGET_USER_ID}'...")
            
            # Delete the old doc and insert new one to avoid immutable field issues if any
            # But wait, usually user_id is immutable? In Mongo it's just a field unless _id.
            # user_id is NOT _id here.
            
            # We can try update_one
            try:
                await profiles_col.update_one(
                    {"_id": source_profile["_id"]},
                    {"$set": {"user_id": TARGET_USER_ID, "userData.plan": "selfhost"}}
                )
                print("  Profile migrated successfully.")
            except Exception as e:
                print(f"  Error migrating profile: {e}")
        else:
            print("  No source user profile found to migrate.")

    print("--- MongoDB Migration Complete ---")

async def migrate_postgres():
    print("\n--- Starting PostgreSQL Migration ---")
    if not all([POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB]):
        print("PostgreSQL config missing. Skipping.")
        return

    try:
        conn = await asyncpg.connect(
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB,
            host=POSTGRES_HOST,
            port=POSTGRES_PORT
        )
        
        # Determine table name. Usually 'facts' or 'memories'. 
        # mcp_hub/memory/db.py implies 'facts' is the table (from earlier views/knowledge)
        # Let's check table existence or just try 'facts'.
        # The 'view_file' of misc/routes.py showed "SELECT id, content ... FROM facts"
        
        table_name = "facts"
        
        # Check if row has user_id column
        # Assuming it does.
        
        query = f"UPDATE {table_name} SET user_id = $1 WHERE user_id != $1"
        result = await conn.execute(query, TARGET_USER_ID)
        print(f"  {result}") # e.g. "UPDATE 10"
        
        await conn.close()
    except Exception as e:
        print(f"  Error migrating PostgreSQL: {e}")

    print("--- PostgreSQL Migration Complete ---")

async def main():
    await migrate_mongo()
    await migrate_postgres()

if __name__ == "__main__":
    asyncio.run(main())

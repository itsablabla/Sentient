# src/server/main/dependencies.py
from main.db import SupabaseManager
from main.auth.utils import AuthHelper
from main.websocket import MainWebSocketManager

# --- Global Instances ---
# These instances are created once here and imported by other modules
# to ensure a single, shared instance across the application.
mongo_manager = SupabaseManager()  # Named mongo_manager for backward compat across codebase
auth_helper = AuthHelper()
websocket_manager = MainWebSocketManager()

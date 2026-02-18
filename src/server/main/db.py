# src/server/main/db.py
import os
import datetime
import uuid
import json
import logging
from typing import Dict, List, Optional, Any, Tuple

from supabase import create_client, Client

from main.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, ENVIRONMENT
from workers.utils.crypto import encrypt_doc, decrypt_doc, encrypt_field, decrypt_field

DB_ENCRYPTION_ENABLED = ENVIRONMENT == 'stag'

SENSITIVE_TASK_FIELDS = ["name", "description", "plan", "runs", "original_context", "chat_history", "error", "clarifying_questions", "result", "swarm_details", "orchestrator_state", "dynamic_plan", "clarification_requests", "execution_log"]

logger = logging.getLogger(__name__)


def _decrypt_docs(docs: List[Dict], fields: List[str]):
    if not DB_ENCRYPTION_ENABLED or not docs:
        return
    for doc in docs:
        decrypt_doc(doc, fields)


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class SupabaseManager:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            logger.warning("Supabase credentials not set. Database operations will fail.")
            self.client: Optional[Client] = None
        else:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print(f"[{datetime.datetime.now()}] [MainServer_SupabaseManager] Initialized.")

    async def initialize_db(self):
        """No-op for Supabase — schema is managed via migrations/SQL editor."""
        print(f"[{datetime.datetime.now()}] [MainServer_DB_INIT] Supabase client ready. Schema managed externally.")

    # --- User Profile Methods ---
    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        if not user_id:
            return None
        try:
            result = self.client.table("user_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
            if result is None:
                return None
            doc = result.data
        except Exception as e:
            print(f"[DB] get_user_profile error for {user_id}: {e}")
            return None
        if not doc:
            return None
        if DB_ENCRYPTION_ENABLED and "user_data" in doc:
            user_data = doc["user_data"]
            SENSITIVE_USER_DATA_FIELDS = ["onboardingAnswers", "personalInfo", "pwa_subscription", "privacyFilters"]
            for field in SENSITIVE_USER_DATA_FIELDS:
                if field in user_data and user_data[field] is not None:
                    user_data[field] = decrypt_field(user_data[field])
        # Map user_data to userData for backward compatibility with rest of codebase
        if "user_data" in doc:
            doc["userData"] = doc.pop("user_data")
        return doc

    async def update_user_profile(self, user_id: str, profile_data: Dict) -> bool:
        if not user_id or not profile_data:
            return False
        if "_id" in profile_data:
            del profile_data["_id"]

        now_utc = _now_iso()

        # Convert dot-notation keys (e.g., "userData.field") to nested JSONB updates
        user_data_updates = {}
        top_level_updates = {}

        for key, value in profile_data.items():
            if key.startswith("userData."):
                nested_key = key[len("userData."):]
                if DB_ENCRYPTION_ENABLED:
                    SENSITIVE_USER_DATA_FIELDS = ["onboardingAnswers", "personalInfo", "pwa_subscription", "privacyFilters"]
                    if nested_key.split('.')[0] in SENSITIVE_USER_DATA_FIELDS:
                        value = encrypt_field(value)
                user_data_updates[nested_key] = value
            else:
                top_level_updates[key] = value

        # Check if the profile exists
        existing = self.client.table("user_profiles").select("id, user_data").eq("user_id", user_id).maybe_single().execute()

        if existing.data:
            # UPDATE existing profile
            update_payload = {"last_updated": now_utc}

            if user_data_updates:
                # Merge new user_data fields into existing user_data
                existing_user_data = existing.data.get("user_data", {}) or {}
                for nested_key, value in user_data_updates.items():
                    parts = nested_key.split('.')
                    target = existing_user_data
                    for part in parts[:-1]:
                        if part not in target or not isinstance(target[part], dict):
                            target[part] = {}
                        target = target[part]
                    target[parts[-1]] = value
                update_payload["user_data"] = existing_user_data

            if top_level_updates:
                update_payload.update(top_level_updates)

            result = self.client.table("user_profiles").update(update_payload).eq("user_id", user_id).execute()
            return len(result.data) > 0
        else:
            # INSERT new profile
            new_user_data = {}
            for nested_key, value in user_data_updates.items():
                parts = nested_key.split('.')
                target = new_user_data
                for part in parts[:-1]:
                    if part not in target or not isinstance(target[part], dict):
                        target[part] = {}
                    target = target[part]
                target[parts[-1]] = value

            insert_payload = {
                "user_id": user_id,
                "user_data": new_user_data,
                "created_at": now_utc,
                "last_updated": now_utc,
            }
            insert_payload.update(top_level_updates)

            result = self.client.table("user_profiles").insert(insert_payload).execute()
            return len(result.data) > 0

    async def update_user_last_active(self, user_id: str) -> bool:
        if not user_id:
            return False
        now_utc = _now_iso()

        existing = self.client.table("user_profiles").select("id, user_data").eq("user_id", user_id).maybe_single().execute()

        if existing.data:
            user_data = existing.data.get("user_data", {}) or {}
            user_data["last_active_timestamp"] = now_utc
            self.client.table("user_profiles").update({
                "user_data": user_data,
                "last_updated": now_utc
            }).eq("user_id", user_id).execute()
            return True
        else:
            self.client.table("user_profiles").insert({
                "user_id": user_id,
                "user_data": {"last_active_timestamp": now_utc},
                "created_at": now_utc,
                "last_updated": now_utc,
            }).execute()
            return True

    async def get_completed_task_count_for_period(self, user_id: str, start_date: datetime.datetime, end_date: datetime.datetime) -> int:
        result = self.client.table("tasks") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .eq("status", "completed") \
            .gte("updated_at", start_date.isoformat()) \
            .lt("updated_at", end_date.isoformat()) \
            .execute()
        return result.count or 0

    async def has_notification_type(self, user_id: str, notification_type: str) -> bool:
        if not user_id or not notification_type:
            return False
        result = self.client.table("notifications") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("type", notification_type) \
            .limit(1) \
            .execute()
        return len(result.data) > 0

    # --- Usage Tracking Methods ---
    async def get_or_create_daily_usage(self, user_id: str) -> Dict[str, Any]:
        today_str = _now_utc().strftime("%Y-%m-%d")
        result = self.client.table("daily_usage").select("*").eq("user_id", user_id).eq("date", today_str).maybe_single().execute()
        if result.data:
            return result.data
        # Create new
        insert_result = self.client.table("daily_usage").upsert({
            "user_id": user_id,
            "date": today_str,
        }, on_conflict="user_id,date").execute()
        return insert_result.data[0] if insert_result.data else {"user_id": user_id, "date": today_str}

    async def increment_daily_usage(self, user_id: str, feature: str, amount: int = 1):
        today_str = _now_utc().strftime("%Y-%m-%d")
        # Ensure the row exists first
        existing = self.client.table("daily_usage").select(feature).eq("user_id", user_id).eq("date", today_str).maybe_single().execute()
        if existing.data:
            current_val = existing.data.get(feature, 0) or 0
            self.client.table("daily_usage").update({feature: current_val + amount}).eq("user_id", user_id).eq("date", today_str).execute()
        else:
            self.client.table("daily_usage").insert({
                "user_id": user_id,
                "date": today_str,
                feature: amount,
            }).execute()

    async def get_or_create_monthly_usage(self, user_id: str) -> Dict[str, Any]:
        current_month_str = _now_utc().strftime("%Y-%m")
        result = self.client.table("monthly_usage").select("*").eq("user_id", user_id).eq("month", current_month_str).maybe_single().execute()
        if result.data:
            return result.data
        insert_result = self.client.table("monthly_usage").upsert({
            "user_id": user_id,
            "month": current_month_str,
        }, on_conflict="user_id,month").execute()
        return insert_result.data[0] if insert_result.data else {"user_id": user_id, "month": current_month_str}

    async def increment_monthly_usage(self, user_id: str, feature: str, amount: int = 1):
        current_month_str = _now_utc().strftime("%Y-%m")
        existing = self.client.table("monthly_usage").select(feature).eq("user_id", user_id).eq("month", current_month_str).maybe_single().execute()
        if existing.data:
            current_val = existing.data.get(feature, 0) or 0
            self.client.table("monthly_usage").update({feature: current_val + amount}).eq("user_id", user_id).eq("month", current_month_str).execute()
        else:
            self.client.table("monthly_usage").insert({
                "user_id": user_id,
                "month": current_month_str,
                feature: amount,
            }).execute()

    # --- Notification Methods ---
    async def get_notifications(self, user_id: str) -> List[Dict]:
        if not user_id:
            return []
        result = self.client.table("notifications") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()

        notifications_list = result.data or []

        if DB_ENCRYPTION_ENABLED:
            SENSITIVE_NOTIFICATION_FIELDS = ["message", "suggestion_payload"]
            for notification in notifications_list:
                for field in SENSITIVE_NOTIFICATION_FIELDS:
                    if field in notification and notification[field] is not None:
                        notification[field] = decrypt_field(notification[field])

        # Map created_at to timestamp for backward compatibility
        for notification in notifications_list:
            notification["timestamp"] = notification.get("created_at")
            notification["id"] = notification.get("notification_id")

        return notifications_list

    async def add_notification(self, user_id: str, notification_data: Dict) -> Optional[Dict]:
        if not user_id or not notification_data:
            return None

        now_utc = _now_iso()
        notification_id = str(uuid.uuid4())

        notification_data["timestamp"] = now_utc
        notification_data["id"] = notification_id

        insert_payload = {
            "user_id": user_id,
            "notification_id": notification_id,
            "type": notification_data.get("type"),
            "message": notification_data.get("message"),
            "task_id": notification_data.get("task_id"),
            "suggestion_payload": notification_data.get("suggestion_payload"),
            "created_at": now_utc,
        }

        if DB_ENCRYPTION_ENABLED:
            SENSITIVE_NOTIFICATION_FIELDS = ["message", "suggestion_payload"]
            for field in SENSITIVE_NOTIFICATION_FIELDS:
                if field in insert_payload and insert_payload[field] is not None:
                    insert_payload[field] = encrypt_field(insert_payload[field])

        result = self.client.table("notifications").insert(insert_payload).execute()

        if result.data:
            # Enforce max 50 notifications per user: delete oldest beyond 50
            count_result = self.client.table("notifications").select("id", count="exact").eq("user_id", user_id).execute()
            if count_result.count and count_result.count > 50:
                # Get IDs of oldest notifications beyond the 50 limit
                oldest = self.client.table("notifications") \
                    .select("id") \
                    .eq("user_id", user_id) \
                    .order("created_at", desc=True) \
                    .range(50, count_result.count) \
                    .execute()
                if oldest.data:
                    old_ids = [row["id"] for row in oldest.data]
                    self.client.table("notifications").delete().in_("id", old_ids).execute()

            return notification_data
        return None

    async def delete_notification(self, user_id: str, notification_id: str) -> bool:
        if not user_id or not notification_id:
            return False
        result = self.client.table("notifications") \
            .delete() \
            .eq("user_id", user_id) \
            .eq("notification_id", notification_id) \
            .execute()
        return len(result.data) > 0

    async def delete_all_notifications(self, user_id: str):
        if not user_id:
            return
        self.client.table("notifications").delete().eq("user_id", user_id).execute()

    async def delete_pwa_subscription(self, user_id: str, endpoint: str) -> bool:
        if not user_id or not endpoint:
            return False
        existing = self.client.table("user_profiles").select("user_data").eq("user_id", user_id).maybe_single().execute()
        if not existing.data:
            return False
        user_data = existing.data.get("user_data", {}) or {}
        subs = user_data.get("pwa_subscriptions", []) or []
        new_subs = [s for s in subs if s.get("endpoint") != endpoint]
        if len(new_subs) == len(subs):
            return False
        user_data["pwa_subscriptions"] = new_subs
        self.client.table("user_profiles").update({"user_data": user_data}).eq("user_id", user_id).execute()
        logger.info(f"Removed expired PWA subscription for endpoint: {endpoint[-10:]}...")
        return True

    async def get_recent_completed_tasks_for_period(self, user_id: str, start_date: datetime.datetime, end_date: datetime.datetime, limit: int = 2) -> List[Dict]:
        result = self.client.table("tasks") \
            .select("name, updated_at") \
            .eq("user_id", user_id) \
            .eq("status", "completed") \
            .gte("updated_at", start_date.isoformat()) \
            .lt("updated_at", end_date.isoformat()) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        tasks = result.data or []
        _decrypt_docs(tasks, ["name"])
        return tasks

    # --- Task Methods ---
    async def add_task(self, user_id: str, task_data: dict) -> str:
        task_id = str(uuid.uuid4())
        now_utc = _now_iso()

        schedule = task_data.get("schedule")
        if isinstance(schedule, str):
            try:
                schedule = json.loads(schedule)
            except json.JSONDecodeError:
                schedule = None

        task_doc = {
            "task_id": task_id,
            "user_id": user_id,
            "name": task_data.get("name", "New Task"),
            "description": task_data.get("description", ""),
            "status": "planning",
            "assignee": "ai",
            "priority": task_data.get("priority", 1),
            "plan": [],
            "runs": [],
            "schedule": schedule,
            "enabled": True,
            "original_context": task_data.get("original_context", {"source": "manual_creation"}),
            "created_at": now_utc,
            "updated_at": now_utc,
            "chat_history": [],
            "next_execution_at": None,
            "last_execution_at": None,
            "task_type": task_data.get("task_type", "single"),
        }

        task_type = task_doc["task_type"]
        if task_type == "swarm":
            task_doc["swarm_details"] = task_data.get("swarm_details", {})
        elif task_type == "long_form":
            task_doc["orchestrator_state"] = task_data.get("orchestrator_state")
            task_doc["dynamic_plan"] = task_data.get("dynamic_plan", [])
            task_doc["clarification_requests"] = task_data.get("clarification_requests", [])
            task_doc["execution_log"] = task_data.get("execution_log", [])
            task_doc["auto_approve_subtasks"] = task_data.get("auto_approve_subtasks", False)

        encrypt_doc(task_doc, SENSITIVE_TASK_FIELDS)

        self.client.table("tasks").insert(task_doc).execute()
        logger.info(f"Created new task {task_id} (type: {task_doc['task_type']}) for user {user_id} with status 'planning'.")
        return task_id

    async def get_task(self, task_id: str, user_id: str) -> Optional[Dict]:
        result = self.client.table("tasks").select("*").eq("task_id", task_id).eq("user_id", user_id).maybe_single().execute()
        doc = result.data
        decrypt_doc(doc, SENSITIVE_TASK_FIELDS)
        return doc

    async def count_active_workflows(self, user_id: str) -> int:
        result = self.client.table("tasks") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .eq("status", "active") \
            .in_("task_type", ["recurring", "triggered"]) \
            .execute()
        return result.count or 0

    async def get_all_tasks_for_user(self, user_id: str) -> List[Dict]:
        result = self.client.table("tasks") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        docs = result.data or []
        _decrypt_docs(docs, SENSITIVE_TASK_FIELDS)
        return docs

    async def update_task(self, task_id: str, user_id: str, updates: Dict) -> bool:
        updates["updated_at"] = _now_iso()
        encrypt_doc(updates, SENSITIVE_TASK_FIELDS)
        result = self.client.table("tasks") \
            .update(updates) \
            .eq("task_id", task_id) \
            .eq("user_id", user_id) \
            .execute()
        return len(result.data) > 0

    async def add_answers_to_task(self, task_id: str, answers: List[Dict], user_id: str) -> bool:
        task = await self.get_task(task_id, user_id)
        if not task:
            return False

        current_questions = task.get("clarifying_questions", [])
        if not current_questions:
            if task.get("runs"):
                current_questions = task["runs"][-1].get("clarifying_questions", [])
            if not current_questions:
                logger.warning(f"add_answers_to_task called for task {task_id}, but no questions found.")
                return False

        answer_map = {ans.get("question_id"): ans.get("answer_text") for ans in answers}
        for question in current_questions:
            q_id = question.get("question_id")
            if q_id in answer_map:
                question["answer"] = answer_map[q_id]

        return await self.update_task(task_id, user_id, {"clarifying_questions": current_questions})

    async def delete_task(self, task_id: str, user_id: str) -> Tuple[bool, List[str]]:
        # 1. Find all sub-tasks
        sub_result = self.client.table("tasks") \
            .select("task_id") \
            .eq("user_id", user_id) \
            .contains("original_context", {"parent_task_id": task_id}) \
            .execute()
        sub_task_ids = [st["task_id"] for st in (sub_result.data or [])]

        # 2. Delete sub-tasks if any exist
        if sub_task_ids:
            self.client.table("tasks").delete().in_("task_id", sub_task_ids).eq("user_id", user_id).execute()
            logger.info(f"Deleted {len(sub_task_ids)} sub-tasks for parent task {task_id}.")

        # 3. Delete the parent task
        delete_result = self.client.table("tasks").delete().eq("task_id", task_id).eq("user_id", user_id).execute()
        parent_deleted = len(delete_result.data) > 0

        if not parent_deleted and not sub_task_ids:
            return False, []

        all_deleted_ids = [task_id] if parent_deleted else []
        all_deleted_ids.extend(sub_task_ids)
        return True, all_deleted_ids

    async def decline_task(self, task_id: str, user_id: str) -> str:
        success = await self.update_task(task_id, user_id, {"status": "declined"})
        return "Task declined." if success else None

    async def delete_tasks_by_tool(self, user_id: str, tool_name: str) -> int:
        if not user_id or not tool_name:
            return 0
        # Use RPC or filter on JSONB — fetch matching tasks then delete
        result = self.client.table("tasks") \
            .select("task_id") \
            .eq("user_id", user_id) \
            .execute()

        matching_ids = []
        for task in (result.data or []):
            task_id = task["task_id"]
            # Get full task to check runs.plan.tool
            full_task = self.client.table("tasks").select("runs").eq("task_id", task_id).maybe_single().execute()
            if full_task.data:
                runs = full_task.data.get("runs", []) or []
                for run in runs:
                    plan_steps = run.get("plan", []) or []
                    if any(step.get("tool") == tool_name for step in plan_steps):
                        matching_ids.append(task_id)
                        break

        if matching_ids:
            self.client.table("tasks").delete().in_("task_id", matching_ids).eq("user_id", user_id).execute()

        logger.info(f"Deleted {len(matching_ids)} tasks for user {user_id} using tool '{tool_name}'.")
        return len(matching_ids)

    async def cancel_latest_run(self, task_id: str, user_id: str) -> bool:
        task = await self.get_task(task_id, user_id)
        if not task or not task.get("runs"):
            return False

        runs = task.get("runs", [])
        if not isinstance(runs, list) or not runs:
            return False

        runs.pop()
        return await self.update_task(task_id, user_id, {"status": "completed", "runs": runs})

    async def delete_notifications_for_task(self, user_id: str, task_id: str):
        if not user_id or not task_id:
            return
        self.client.table("notifications").delete().eq("user_id", user_id).eq("task_id", task_id).execute()
        logger.info(f"Deleted notifications for task {task_id} for user {user_id}.")

    async def rerun_task(self, original_task_id: str, user_id: str) -> Optional[str]:
        original_task = await self.get_task(original_task_id, user_id)
        if not original_task:
            return None

        new_task_doc = original_task.copy()
        new_task_id = str(uuid.uuid4())
        now_utc = _now_iso()

        # Remove Supabase's auto-fields
        for key in ["id", "created_at", "updated_at"]:
            new_task_doc.pop(key, None)

        new_task_doc["task_id"] = new_task_id
        new_task_doc["status"] = "planning"
        new_task_doc["created_at"] = now_utc
        new_task_doc["updated_at"] = now_utc
        new_task_doc["last_execution_at"] = None
        new_task_doc["next_execution_at"] = None

        encrypt_doc(new_task_doc, SENSITIVE_TASK_FIELDS)
        self.client.table("tasks").insert(new_task_doc).execute()
        return new_task_id

    async def create_initial_task(self, user_id: str, name: str, description: str, action_items: list, topics: list, original_context: dict, source_event_id: str) -> Dict:
        task_id = str(uuid.uuid4())
        now_utc = _now_iso()

        task_doc = {
            "task_id": task_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "status": "planning",
            "assignee": "ai",
            "priority": 1,
            "plan": [],
            "runs": [],
            "original_context": original_context,
            "source_event_id": source_event_id,
            "created_at": now_utc,
            "updated_at": now_utc,
            "chat_history": [],
        }

        encrypt_doc(task_doc, SENSITIVE_TASK_FIELDS)
        self.client.table("tasks").insert(task_doc).execute()
        logger.info(f"Created initial task {task_id} for user {user_id}")
        return task_doc

    async def update_task_with_plan(self, task_id: str, user_id: str, plan_data: dict, is_change_request: bool = False, chat_history: Optional[List[Dict]] = None):
        plan_steps = plan_data.get("plan", [])

        update_doc = {
            "status": "approval_pending",
            "plan": plan_steps,
            "updated_at": _now_iso()
        }

        if chat_history is not None:
            update_doc["chat_history"] = chat_history

        if not is_change_request:
            name = plan_data.get("name", "Proactively generated plan")
            update_doc["name"] = name
            update_doc["description"] = plan_data.get("description", "")

        encrypt_doc(update_doc, SENSITIVE_TASK_FIELDS)
        result = self.client.table("tasks").update(update_doc).eq("task_id", task_id).eq("user_id", user_id).execute()
        logger.info(f"Updated task {task_id} with a generated plan. Updated: {len(result.data) > 0}")

    async def save_plan_as_task(self, user_id: str, name: str, description: str, plan: list, original_context: dict, source_event_id: str) -> str:
        task_id = str(uuid.uuid4())
        now_utc = _now_iso()
        task_doc = {
            "task_id": task_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "status": "approval_pending",
            "priority": 1,
            "plan": plan,
            "runs": [],
            "original_context": original_context,
            "source_event_id": source_event_id,
            "created_at": now_utc,
            "updated_at": now_utc,
            "agent_id": "planner_agent"
        }
        encrypt_doc(task_doc, SENSITIVE_TASK_FIELDS)
        self.client.table("tasks").insert(task_doc).execute()
        logger.info(f"Saved new plan with task_id: {task_id} for user: {user_id}")
        return task_id

    # --- Message Methods ---
    async def add_message(self, user_id: str, role: str, content: str, message_id: Optional[str] = None, turn_steps: Optional[List[Dict]] = None) -> Dict:
        now = _now_iso()
        final_message_id = message_id if message_id else str(uuid.uuid4())

        # Prevent duplicate user messages if client retries
        if role == "user" and message_id:
            existing = self.client.table("messages").select("*").eq("message_id", final_message_id).eq("user_id", user_id).maybe_single().execute()
            if existing.data:
                logger.info(f"Message with ID {final_message_id} already exists for user {user_id}. Skipping.")
                return existing.data

        message_doc = {
            "message_id": final_message_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "created_at": now,
            "is_summarized": False,
            "summary_id": None,
        }

        if turn_steps:
            message_doc["turn_steps"] = turn_steps

        SENSITIVE_MESSAGE_FIELDS = ["content", "turn_steps"]
        encrypt_doc(message_doc, SENSITIVE_MESSAGE_FIELDS)

        result = self.client.table("messages").insert(message_doc).execute()
        logger.info(f"Added message for user {user_id} with role {role}")
        return result.data[0] if result.data else message_doc

    async def get_message_history(self, user_id: str, limit: int, before_timestamp_iso: Optional[str] = None) -> List[Dict]:
        query = self.client.table("messages").select("*").eq("user_id", user_id)

        if before_timestamp_iso:
            try:
                before_ts = before_timestamp_iso.replace("Z", "+00:00")
                query = query.lt("created_at", before_ts)
            except (ValueError, TypeError):
                logger.warning(f"Invalid before_timestamp format: {before_timestamp_iso}, ignoring.")

        result = query.order("created_at", desc=True).limit(limit).execute()
        messages = result.data or []

        SENSITIVE_MESSAGE_FIELDS = ["content", "turn_steps"]
        _decrypt_docs(messages, SENSITIVE_MESSAGE_FIELDS)

        # Map created_at to timestamp for backward compatibility
        for msg in messages:
            msg["timestamp"] = msg.get("created_at")

        return messages

    async def delete_message(self, user_id: str, message_id: str) -> bool:
        if not user_id or not message_id:
            return False
        result = self.client.table("messages").delete().eq("user_id", user_id).eq("message_id", message_id).execute()
        return len(result.data) > 0

    async def delete_all_messages(self, user_id: str) -> int:
        if not user_id:
            return 0
        result = self.client.table("messages").delete().eq("user_id", user_id).execute()
        count = len(result.data) if result.data else 0
        logger.info(f"Deleted {count} messages for user {user_id}.")
        return count

    async def close(self):
        # Supabase client doesn't need explicit closing
        print(f"[{datetime.datetime.now()}] [MainServer_SupabaseManager] Client reference cleared.")
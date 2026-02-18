-- ============================================================
-- Sentient: Supabase PostgreSQL Schema
-- Replaces all MongoDB collections with relational tables.
-- Run this in the Supabase SQL Editor or via psql.
-- ============================================================

-- ============================================================
-- 1. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL UNIQUE,
    user_data       JSONB NOT NULL DEFAULT '{}',
    integrations    JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_last_active ON user_profiles ((user_data->>'last_active_timestamp'));
CREATE INDEX idx_user_profiles_onboarding ON user_profiles ((user_data->>'onboardingComplete'));

-- ============================================================
-- 2. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    notification_id TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    type            TEXT,
    message         TEXT,
    task_id         TEXT,
    suggestion_payload JSONB,
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_type ON notifications (user_id, type);

-- ============================================================
-- 3. DAILY USAGE (auto-expires via pg_cron or Supabase Edge Function)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_usage (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    date            TEXT NOT NULL,  -- Format: YYYY-MM-DD
    messages_sent   INT NOT NULL DEFAULT 0,
    tasks_created   INT NOT NULL DEFAULT 0,
    voice_minutes   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
);

CREATE INDEX idx_daily_usage_date ON daily_usage (date DESC);

-- ============================================================
-- 4. MONTHLY USAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_usage (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    month           TEXT NOT NULL,  -- Format: YYYY-MM
    messages_sent   INT NOT NULL DEFAULT 0,
    tasks_created   INT NOT NULL DEFAULT 0,
    voice_minutes   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, month)
);

-- ============================================================
-- 5. PROCESSED ITEMS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS processed_items_log (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 TEXT NOT NULL,
    service_name            TEXT NOT NULL,
    item_id                 TEXT NOT NULL,
    processing_timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, service_name, item_id)
);

CREATE INDEX idx_processed_items_timestamp ON processed_items_log (processing_timestamp DESC);

-- ============================================================
-- 6. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                  BIGSERIAL PRIMARY KEY,
    task_id             TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    user_id             TEXT NOT NULL,
    name                TEXT NOT NULL DEFAULT 'New Task',
    description         TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'planning',
    assignee            TEXT NOT NULL DEFAULT 'ai',
    priority            INT NOT NULL DEFAULT 1,
    task_type           TEXT NOT NULL DEFAULT 'single',
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    plan                JSONB NOT NULL DEFAULT '[]',
    runs                JSONB NOT NULL DEFAULT '[]',
    schedule            JSONB,
    chat_history        JSONB NOT NULL DEFAULT '[]',
    original_context    JSONB NOT NULL DEFAULT '{}',
    error               TEXT,
    clarifying_questions JSONB,
    result              JSONB,
    -- Swarm task fields
    swarm_details       JSONB,
    -- Long-form task fields
    orchestrator_state  JSONB,
    dynamic_plan        JSONB DEFAULT '[]',
    clarification_requests JSONB DEFAULT '[]',
    execution_log       JSONB DEFAULT '[]',
    auto_approve_subtasks BOOLEAN DEFAULT FALSE,
    -- Agent info
    agent_id            TEXT,
    source_event_id     TEXT,
    -- Timestamps
    next_execution_at   TIMESTAMPTZ,
    last_execution_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_created ON tasks (user_id, created_at DESC);
CREATE INDEX idx_tasks_user_status_priority ON tasks (user_id, status, priority);
CREATE INDEX idx_tasks_status_agent ON tasks (status, agent_id);
CREATE INDEX idx_tasks_task_id ON tasks (task_id);

-- Full-text search on name and description
CREATE INDEX idx_tasks_text_search ON tasks USING GIN (to_tsvector('english', name || ' ' || description));

-- ============================================================
-- 7. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              BIGSERIAL PRIMARY KEY,
    message_id      TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    user_id         TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL DEFAULT '',
    turn_steps      JSONB,
    is_summarized   BOOLEAN NOT NULL DEFAULT FALSE,
    summary_id      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_user_created ON messages (user_id, created_at DESC);
CREATE INDEX idx_messages_text_search ON messages USING GIN (to_tsvector('english', content));

-- ============================================================
-- CLEANUP: Auto-delete expired rows (run via pg_cron or Supabase)
-- Schedule these as cron jobs:
--
-- Daily usage older than 2 days:
--   DELETE FROM daily_usage WHERE created_at < NOW() - INTERVAL '2 days';
--
-- Processed items older than 30 days:
--   DELETE FROM processed_items_log WHERE processing_timestamp < NOW() - INTERVAL '30 days';
-- ============================================================

-- ============================================================
-- Memory tables (facts, topics, fact_topics) with pgvector
-- Replicates mcp_hub/memory/db.py setup. Memory MCP and main
-- server memories API now use Supabase for storage.
-- ============================================================

-- Enable pgvector (enable in Dashboard > Extensions if not already)
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding dimension must match code: 768 (EMBEDDING_DIM in memory db)
-- ============================================================
-- TOPICS (reference table, seeded from mcp_hub/memory/constants.py)
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL
);

-- ============================================================
-- FACTS (memory rows with vector embedding)
-- ============================================================
CREATE TABLE IF NOT EXISTS facts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_reminded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION update_facts_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_facts_updated_at ON facts;
CREATE TRIGGER update_facts_updated_at
BEFORE UPDATE ON facts
FOR EACH ROW
EXECUTE PROCEDURE update_facts_updated_at_column();

-- ============================================================
-- FACT_TOPICS (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS fact_topics (
    fact_id INTEGER NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (fact_id, topic_id)
);

-- Indexes (match mcp_hub/memory/db.py for vector and filters)
CREATE INDEX IF NOT EXISTS idx_facts_user_id ON facts (user_id);
CREATE INDEX IF NOT EXISTS idx_facts_user_id_source ON facts (user_id, source);
CREATE INDEX IF NOT EXISTS idx_facts_embedding_cos ON facts USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_facts_expires_at ON facts (expires_at) WHERE expires_at IS NOT NULL;

-- Seed topics (from mcp_hub/memory/constants.py TOPICS)
INSERT INTO topics (name, description) VALUES
  ('Personal Identity', 'Core traits, personality, beliefs, values, ethics, and preferences'),
  ('Interests & Lifestyle', 'Hobbies, recreational activities, habits, routines, daily behavior'),
  ('Work & Learning', 'Career, jobs, professional achievements, academic background, skills, certifications'),
  ('Health & Wellbeing', 'Mental and physical health, self-care practices'),
  ('Relationships & Social Life', 'Family, friends, romantic connections, social interactions, social media'),
  ('Financial', 'Income, expenses, investments, financial goals'),
  ('Goals & Challenges', 'Aspirations, objectives, obstacles, and difficulties faced'),
  ('Miscellaneous', 'Anything that doesn''t clearly fit into the above')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

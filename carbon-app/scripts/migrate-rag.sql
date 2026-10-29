-- CarbonTrack — Migration: RAG Methodology Assistant
-- Uses PostgreSQL full-text search (no pgvector needed).
-- Documents ingested: VM0048, Verra Registry TOU, Verra Registry User Guide
--
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-rag.sql

-- ─── Documents (one row per PDF) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rag_documents (
  id              SERIAL PRIMARY KEY,
  filename        VARCHAR(255) NOT NULL,
  methodology_code VARCHAR(20),          -- VM0048, VM0047, null for registry docs
  title           TEXT NOT NULL,
  total_pages     INTEGER,
  total_chunks    INTEGER DEFAULT 0,
  ingested_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(filename)
);

-- ─── Chunks (one row per text segment ~400 words) ─────────────────────────────

CREATE TABLE IF NOT EXISTS rag_chunks (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  search_vector   tsvector,
  methodology_code VARCHAR(20),
  page_hint       INTEGER    -- approximate page number in source PDF
);

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_rag_chunks_fts
  ON rag_chunks USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_methodology
  ON rag_chunks(methodology_code);

-- ─── Query log (optional — for future analytics) ────────────────────────────

CREATE TABLE IF NOT EXISTS rag_query_logs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id),
  question        TEXT NOT NULL,
  chunks_used     INTEGER,
  model           VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW()
);

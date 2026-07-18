-- Migration: Add 2560 dimension embedding tables for DeepInfra Qwen3-Embedding-4B

CREATE TABLE IF NOT EXISTS embeddings_2560 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  embedding halfvec(2560) NOT NULL,
  canonical_text TEXT,
  UNIQUE(movie_id, model)
);

CREATE TABLE IF NOT EXISTS series_embeddings_2560 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  embedding halfvec(2560) NOT NULL,
  canonical_text TEXT,
  UNIQUE(series_id, model)
);

CREATE TABLE IF NOT EXISTS episode_embeddings_2560 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  embedding halfvec(2560) NOT NULL,
  canonical_text TEXT,
  UNIQUE(episode_id, model)
);

-- HNSW indexes using binary quantization because pgvector's HNSW index has a 4000 dimension limit
CREATE INDEX IF NOT EXISTS idx_embeddings_2560_bq_hnsw ON embeddings_2560
  USING hnsw ((binary_quantize(embedding)::bit(2560)) bit_hamming_ops);
CREATE INDEX IF NOT EXISTS idx_embeddings_2560_movie_id ON embeddings_2560(movie_id);

CREATE INDEX IF NOT EXISTS idx_series_embeddings_2560_bq_hnsw ON series_embeddings_2560
  USING hnsw ((binary_quantize(embedding)::bit(2560)) bit_hamming_ops);
CREATE INDEX IF NOT EXISTS idx_series_embeddings_2560_series_id ON series_embeddings_2560(series_id);

CREATE INDEX IF NOT EXISTS idx_episode_embeddings_2560_bq_hnsw ON episode_embeddings_2560
  USING hnsw ((binary_quantize(embedding)::bit(2560)) bit_hamming_ops);
CREATE INDEX IF NOT EXISTS idx_episode_embeddings_2560_episode_id ON episode_embeddings_2560(episode_id);

COMMENT ON TABLE embeddings_2560 IS 'Vector embeddings (2560 dim) for movies - uses binary quantized HNSW index';
COMMENT ON TABLE series_embeddings_2560 IS 'Vector embeddings (2560 dim) for TV series - uses binary quantized HNSW index';
COMMENT ON TABLE episode_embeddings_2560 IS 'Vector embeddings (2560 dim) for TV episodes - uses binary quantized HNSW index';

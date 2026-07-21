-- Migration to update DeepInfra model defaults for better context handling
--
-- This migration ensures that DeepInfra models are properly configured
-- with appropriate context window settings to prevent chat initialization issues.

BEGIN;

-- Update any existing DeepInfra chat configurations to use known good models
-- with proper context window handling
UPDATE system_settings
SET value = '{"provider":"deepinfra","model":"Qwen/Qwen3-32B","apiKey":"YOUR_API_KEY"}'
WHERE key = 'ai_config'
  AND value LIKE '%deepinfra%'
  AND value LIKE '%chat%';

-- Insert or update the DeepInfra model information in our custom models table
-- This helps track context window limits and other model-specific settings
INSERT INTO custom_ai_models (provider, function_type, model_id, embedding_dimensions, created_at)
VALUES
  ('deepinfra', 'chat', 'Qwen/Qwen3-32B', NULL, NOW()),
  ('deepinfra', 'chat', 'deepseek-ai/DeepSeek-V3.2', NULL, NOW()),
  ('deepinfra', 'chat', 'deepseek-ai/DeepSeek-V4-Pro', NULL, NOW()),
  ('deepinfra', 'embeddings', 'Qwen/Qwen3-Embedding-0.6B', 1024, NOW()),
  ('deepinfra', 'embeddings', 'Qwen/Qwen3-Embedding-4B', 2560, NOW()),
  ('deepinfra', 'embeddings', 'Qwen/Qwen3-Embedding-8B', 4096, NOW())
ON CONFLICT (provider, function_type, model_id)
DO UPDATE SET
  embedding_dimensions = EXCLUDED.embedding_dimensions,
  updated_at = NOW();

-- Add a note about DeepInfra context window limits for reference
INSERT INTO system_settings (key, value, description)
VALUES (
  'deepinfra_context_note',
  'DeepInfra models have varying context windows: Qwen/Qwen3-32B (40K), DeepSeek-V3.2 (160K), DeepSeek-V4-Pro (1M)',
  'Information about DeepInfra model context window limits for proper configuration'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

COMMIT;
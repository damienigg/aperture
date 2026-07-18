-- Migration: 0116_restrict_ai_library_setting
-- Description: Add setting to restrict AI recommendation libraries to their owners

-- Add the new setting with default value true (restrict by default for privacy)
INSERT INTO system_settings (key, value, description)
VALUES (
  'restrict_ai_library_to_owner',
  'true',
  'Restrict AI recommendation libraries to be visible only to their owner. When true, non-admin users will not see other users'' AI libraries. Warning: Users with "Enable all folders" will still see all libraries.'
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
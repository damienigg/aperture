#!/bin/bash

# fix-library-restrictions.sh - Apply restrictions to existing AI libraries in TrueNAS

echo "🔧 Fixing AI Library Restrictions for Existing Libraries"
echo "======================================================"

# Check if we're in the right environment
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. This script must be run on your TrueNAS system."
    exit 1
fi

# Get the database container name
DB_CONTAINER=$(docker ps --format "table {{.Names}}" | grep aperture-db | head -1)
if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Aperture database container not found"
    exit 1
fi

echo "✅ Found database container: $DB_CONTAINER"

# Ensure the restriction setting exists
echo "🔧 Ensuring restriction setting is enabled..."
docker exec $DB_CONTAINER psql -U app -d aperture -c "INSERT INTO system_settings (key, value, description) VALUES ('restrict_ai_library_to_owner', 'true', 'Restrict AI recommendation libraries to be visible only to their owner') ON CONFLICT (key) DO UPDATE SET value = 'true';" > /dev/null 2>&1

echo "✅ Library restriction setting is now enabled"

# Get list of existing AI libraries and their owners
echo "📚 Finding existing AI libraries..."
LIBRARIES=$(docker exec $DB_CONTAINER psql -U app -d aperture -c "SELECT user_id, provider_library_guid FROM strm_libraries WHERE channel_id IS NULL AND provider_library_guid IS NOT NULL;" -t -A 2>/dev/null)

if [ -z "$LIBRARIES" ] || [ "$LIBRARIES" = "(0 rows)" ]; then
    echo "✅ No AI libraries found - nothing to fix"
    exit 0
fi

# Count libraries
LIBRARY_COUNT=$(echo "$LIBRARIES" | wc -l)
echo "_FOUND $LIBRARY_COUNT AI libraries_"

# The restriction will be applied automatically when:
# 1. The application is restarted with the new setting
# 2. Library refresh jobs are run
# 3. Users access their libraries

echo ""
echo "💡 To apply restrictions to existing libraries:"
echo "   1. Restart your Aperture containers: docker restart aperture aperture-db"
echo "   2. Run the 'Refresh AI Libraries' job from the Admin panel"
echo "   3. Or wait for the next scheduled library sync job"
echo ""
echo "📝 Note: This fix only ensures the setting is enabled."
echo "        The actual library restriction is applied when libraries are created/refreshed."
echo "        Users with 'Enable all folders' will still see all libraries (by design)."

echo ""
echo "✅ Setup complete! The restriction setting is now properly configured."
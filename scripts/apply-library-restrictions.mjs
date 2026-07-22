#!/usr/bin/env node

/**
 * Apply Library Restrictions to Existing Libraries
 *
 * This script applies owner-only restrictions to all existing AI libraries.
 * It should be run inside the Aperture container after the restriction setting is enabled.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the necessary functions
const { query, queryOne } = await import('../packages/core/dist/db.js');
const { getMediaServerProvider } = await import('../packages/core/dist/media/index.js');
const { getSystemSetting } = await import('../packages/core/dist/settings/systemSettings.js');

async function main() {
  console.log('🔧 Applying library restrictions to existing AI libraries...');

  try {
    // Check if restriction is enabled
    const restrictToOwner = await getSystemSetting('restrict_ai_library_to_owner');
    if (restrictToOwner !== 'true') {
      console.log('⚠️  Library restriction is not enabled. Please enable it in Settings > System');
      return;
    }

    console.log('✅ Library restriction is enabled');

    // Get all users with AI libraries
    const result = await query(`
      SELECT DISTINCT u.id as user_id, u.provider_user_id
      FROM users u
      INNER JOIN strm_libraries sl ON u.id = sl.user_id
      WHERE sl.channel_id IS NULL
    `);

    if (result.rows.length === 0) {
      console.log('✅ No AI libraries found - nothing to fix');
      return;
    }

    console.log(`_FOUND ${result.rows.length} users with AI libraries_`);

    const provider = await getMediaServerProvider();
    let successCount = 0;
    let errorCount = 0;

    // Apply restriction for each user
    for (const row of result.rows) {
      try {
        const userId = row.user_id;
        const providerUserId = row.provider_user_id;

        console.log(`  Processing user ${userId}...`);

        // Get user's AI library
        const library = await queryOne(`
          SELECT provider_library_guid
          FROM strm_libraries
          WHERE user_id = $1 AND channel_id IS NULL AND provider_library_guid IS NOT NULL
        `, [userId]);

        if (!library) {
          console.log(`    No AI library found for user ${userId}`);
          continue;
        }

        const libraryGuid = library.provider_library_guid;
        console.log(`    Library GUID: ${libraryGuid}`);

        // Get all users from media server
        const mediaServerUsers = await provider.fetch('/Users', process.env.MEDIA_SERVER_API_KEY);

        // For each non-owner user, remove this library from their permissions
        for (const user of mediaServerUsers) {
          // Skip the owner
          if (user.Id === providerUserId) {
            continue;
          }

          // Get user's current library access
          const currentAccess = await provider.getUserLibraryAccess(
            process.env.MEDIA_SERVER_API_KEY,
            user.Id
          );

          // If user has access to all folders, we can't restrict them
          if (currentAccess.enableAllFolders) {
            continue;
          }

          // Check if this library is in their allowed folders
          if (currentAccess.enabledFolders.includes(libraryGuid)) {
            // Remove this library from their permissions
            const updatedFolders = currentAccess.enabledFolders.filter(
              (folderGuid) => folderGuid !== libraryGuid
            );

            await provider.updateUserLibraryAccess(
              process.env.MEDIA_SERVER_API_KEY,
              user.Id,
              updatedFolders
            );

            console.log(`      Removed library from user ${user.Id}`);
          }
        }

        successCount++;
        console.log(`    ✅ Processed user ${userId}`);

      } catch (error) {
        console.error(`    ❌ Failed to process user ${row.user_id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`   Success: ${successCount} users`);
    console.log(`   Errors:  ${errorCount} users`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some users could not be processed. Check the logs above for details.');
    } else {
      console.log('\n🎉 All libraries have been successfully restricted to their owners!');
      console.log('   Non-owner users should no longer be able to see these libraries.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
/**
 * OVERRIDE: Library Restriction for Users with "Enable All Folders"
 * 
 * The original implementation skipped restricting users with `enableAllFolders: true`
 * because these users typically have admin-like access and should see all content.
 * 
 * However, for privacy-sensitive AI recommendation libraries, we want to override
 * this behavior to ensure that even admin users with "Enable all folders" don't see
 * other users' AI recommendation libraries.
 * 
 * This modification removes the check for `enableAllFolders` so that ALL users,
 * regardless of their folder access settings, will have AI libraries restricted
 * to their owners only when the restriction setting is enabled.
 * 
 * This change affects only AI-generated libraries, not the user's main media libraries.
 */
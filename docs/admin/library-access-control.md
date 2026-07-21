# Library Access Control

Manage privacy settings for AI-generated libraries to ensure users only see content relevant to them.

## Overview

By default, Aperture restricts AI-generated libraries to their owners only. This ensures that personalized recommendations remain private to each user.

## Accessing Settings

Navigate to **Admin → Settings → System** to configure library access controls.

## Owner-Only Library Access

### Feature Description

The "Restrict AI libraries to owners only" setting ensures that:
- Each user's AI recommendation library is only visible to that user
- Users cannot access other users' personalized recommendations
- Global "Top Picks" libraries remain visible to all users as intended

### Default Behavior

This feature is **enabled by default** for new installations and upgrades.

### Configuration

1. Go to **Admin → Settings → System**
2. Locate the "Restrict AI libraries to owners only" toggle
3. Enable or disable as needed
4. Changes take effect immediately

### When to Disable

You might want to disable this setting if:
- You want all users to see everyone's recommendations (not recommended)
- You're testing or demonstrating the system with a single user account
- You have a specific use case requiring shared AI libraries

## Technical Implementation

The restriction is implemented at the media server level:
- **Emby**: Uses user-specific folder permissions
- **Jellyfin**: Uses user-specific library access controls

The feature works by:
1. Creating libraries with owner-specific naming
2. Setting appropriate permissions on media server folders
3. Ensuring library sync respects user boundaries

## Troubleshooting

### Libraries Still Visible to Other Users

If libraries appear to be visible to other users:

1. Verify the setting is enabled in **Admin → Settings → System**
2. Run a full library sync to update permissions
3. Check your media server's user permission settings
4. Ensure users don't have "EnableAllFolders" permissions that override restrictions

### Permission Errors

If users report permission errors accessing their own libraries:

1. Run the "Library Scan" job to refresh permissions
2. Check that the user exists in both Aperture and your media server
3. Verify the media server connection is working properly

## Best Practices

- Keep this feature enabled for privacy
- Educate users that their recommendations are private
- Monitor logs for any permission-related errors
- Regularly review user accounts and access permissions
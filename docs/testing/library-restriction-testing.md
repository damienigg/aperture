# AI Library Restriction Testing Guide

This document provides comprehensive testing procedures for the AI library restriction feature that ensures recommendation libraries are only visible to their respective owners.

## Overview

The feature restricts AI recommendation libraries to be visible only to their owners by default. Users with "Enable all folders" permission will still see all libraries due to media server limitations.

## Automated Testing

### Running the Test Script

```bash
# Run all tests
node scripts/test-library-restriction.mjs

# Run only database setting test
node scripts/test-library-restriction.mjs --setting-only

# Show help
node scripts/test-library-restriction.mjs --help
```

### What the Test Script Checks

1. **Database Setting**: Verifies `restrict_ai_library_to_owner` is set to `true` by default
2. **Migration File**: Confirms migration 0116 exists with correct setting
3. **Frontend Integration**: Checks i18n keys are present in translation files
4. **Backend Implementation**: Verifies `restrictLibraryToOwner` function exists
5. **Configuration Files**: Looks for explicit configuration overrides

## Manual Testing Procedures

### Prerequisites

- Running Aperture instance with PostgreSQL database
- Emby or Jellyfin media server connected
- Multiple user accounts configured

### Test Scenario 1: Basic Library Restriction

**Setup:**
1. Create 3 users: `admin`, `user1`, `user2`
2. Enable AI recommendations for all users
3. Ensure none have "Enable all folders" enabled
4. Run recommendation generation for each user

**Test Steps:**
1. Log in as `user1`
2. Navigate to media server libraries
3. Verify `user1`'s AI library is visible
4. Verify `user2`'s AI library is NOT visible
5. Verify `admin`'s AI library is NOT visible
6. Repeat for `user2` and `admin`

**Expected Results:**
- Each user can only see their own AI recommendation library
- Standard media libraries remain accessible to all users
- No cross-user library visibility

### Test Scenario 2: Enable All Folders Users

**Setup:**
1. Create a user with "Enable all folders" permission
2. Generate AI recommendations for other users
3. Keep restriction setting enabled

**Test Steps:**
1. Log in as the "Enable all folders" user
2. Navigate to media server libraries
3. Verify ALL AI libraries are visible (expected behavior)

**Expected Results:**
- User with "Enable all folders" sees all libraries
- This is documented limitation, not a bug

### Test Scenario 3: Disabling the Restriction

**Setup:**
1. Set `restrict_ai_library_to_owner` to `false` in database
2. Restart Aperture service

**Test Steps:**
1. Log in as any user
2. Navigate to media server libraries
3. Verify ALL AI libraries are visible

**Expected Results:**
- All users can see all AI recommendation libraries
- Behavior matches pre-restriction implementation

### Test Scenario 4: Library Cleanup and Recreation

**Setup:**
1. Generate recommendations with restriction enabled
2. Delete a user's AI library manually from media server
3. Regenerate recommendations

**Test Steps:**
1. Verify new library is created with proper restrictions
2. Verify other users still cannot access the library

**Expected Results:**
- New libraries respect restriction settings
- Cleanup/recreation maintains security

## Edge Case Testing

### User Permission Changes

1. Create user with recommendations disabled
2. Enable recommendations - library should be restricted
3. Disable recommendations - library should be removed
4. Re-enable recommendations - new library should be restricted

### Library Name Changes

1. Change user's custom library name
2. Verify restriction still applies to renamed library
3. Verify old library records are properly cleaned up

### Concurrent Operations

1. Run multiple recommendation jobs simultaneously
2. Verify restrictions are applied correctly for all users
3. Verify no race conditions in permission updates

## Database Verification

### Check Setting Value

```sql
SELECT key, value, description 
FROM system_settings 
WHERE key = 'restrict_ai_library_to_owner';
```

Expected: `value` should be `'true'`

### Check Library Records

```sql
SELECT user_id, name, provider_library_id, provider_library_guid
FROM strm_libraries 
WHERE channel_id IS NULL 
ORDER BY user_id;
```

Verify each library has proper GUID for permission management.

## Troubleshooting

### Common Issues

1. **All libraries visible**: Check database setting is `true`
2. **Permission errors**: Verify media server API key has sufficient privileges
3. **Libraries not updating**: Check media server connectivity and library refresh

### Log Analysis

Check logs for:
- `Restricting library to owner` messages
- `Failed to restrict library` warnings
- Permission update success/failure messages

### Debug Commands

```bash
# Check current setting
psql -c "SELECT value FROM system_settings WHERE key = 'restrict_ai_library_to_owner';" postgres://app:app@localhost:5432/aperture

# Check library records
psql -c "SELECT user_id, name FROM strm_libraries WHERE channel_id IS NULL;" postgres://app:app@localhost:5432/aperture

# Restart with fresh logs
docker compose restart app && docker compose logs -f app
```

## Performance Testing

### Load Testing

1. Create 50+ users with recommendations enabled
2. Generate recommendations for all users
3. Verify restriction performance scales appropriately
4. Monitor memory and CPU usage during permission updates

### Timing Verification

- Library restriction should complete within reasonable time (under 1 second per user)
- Large installations should batch process restrictions
- Error handling should not significantly impact performance

## Security Verification

### Access Control Testing

1. Verify non-admin users cannot modify the setting
2. Verify API endpoints properly enforce restrictions
3. Verify direct database access cannot bypass restrictions

### Audit Trail

Check that restriction operations are properly logged:
- Library creation with restriction
- Permission updates
- Error conditions

## Rollback Testing

### Disabling the Feature

1. Set `restrict_ai_library_to_owner` to `false`
2. Verify all existing libraries become visible
3. Verify new libraries are not restricted

### Re-enabling the Feature

1. Set `restrict_ai_library_to_owner` to `true`
2. Run library permission updates
3. Verify restrictions are reapplied

## Integration Testing

### With Different Media Server Versions

Test with:
- Emby 4.8+
- Jellyfin 10.8+
- Various permission model versions

### With Different Database Configurations

Test with:
- External PostgreSQL
- Docker PostgreSQL
- Different schema versions

## Monitoring and Maintenance

### Health Checks

Regular verification that:
- Setting remains `true` (no accidental changes)
- Libraries are properly restricted
- No performance degradation

### Maintenance Procedures

- Regular audit of library permissions
- Cleanup of orphaned library records
- Monitoring of error logs for restriction failures

## Test Results Documentation

Document test results including:
- Test environment configuration
- Test user scenarios
- Observed behavior vs expected
- Any deviations or issues found
- Performance metrics
- Security verification results

This comprehensive testing ensures the library restriction feature works correctly and maintains the privacy of users' AI recommendations while providing flexibility for administrators to configure as needed.
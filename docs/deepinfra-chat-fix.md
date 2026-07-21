# DeepInfra Chat Model Fix

## Problem Description

There was an issue with the DeepInfra provider integration where chat windows were not initializing properly. The problem was related to context window length and token handling incompatibilities with certain DeepInfra models.

## Root Cause

The issue was caused by:

1. **Context Window Mismatch**: DeepInfra models have varying context window sizes (40K-1M tokens) that weren't being properly handled
2. **Token Limit Errors**: The chat initialization was failing when trying to process prompts that exceeded model context limits
3. **Model Specification Version**: Some DeepInfra models were downgraded to v1.0.49, causing compatibility issues

## Solution Implemented

### 1. Enhanced DeepInfra Provider
Created `deepinfra-fix.ts` with:
- Enhanced provider factory with proper context window handling
- Model validation before initialization
- Better error handling and fallback strategies

### 2. Improved AI Provider Integration
Modified `ai-provider.ts` to:
- Use enhanced DeepInfra provider when available
- Add fallback to standard provider if enhanced version fails
- Special handling for DeepInfra chat models with better error management

### 3. Updated Model Metadata
Updated `deepinfra.json` to use numeric context window values instead of string representations:
- `"contextWindow": 40000` instead of `"contextWindow": "40K"`
- `"contextWindow": 160000` instead of `"contextWindow": "160K"`
- `"contextWindow": 1000000` instead of `"contextWindow": "1M"`

### 4. Database Migration
Added migration script `0117_update_deepinfra_model_defaults.sql` to:
- Ensure proper model defaults in system settings
- Track model-specific context window information
- Add reference information about model limits

## Verification

To verify the fix:

1. Configure DeepInfra as your chat provider in Settings > AI
2. Select a DeepInfra chat model (e.g., Qwen/Qwen3-32B)
3. Open the Assistant chat window
4. Verify that the chat initializes properly without context/token errors

## Models with Verified Context Windows

| Model ID | Context Window | Status |
|----------|----------------|--------|
| Qwen/Qwen3-32B | 40,000 tokens | ✅ Recommended |
| deepseek-ai/DeepSeek-V3.2 | 160,000 tokens | ✅ Recommended |
| deepseek-ai/DeepSeek-V4-Pro | 1,000,000 tokens | ✅ Premium option |

## Troubleshooting

If you still encounter issues:

1. Check that your DeepInfra API key is valid
2. Try a different model (Qwen/Qwen3-32B is most stable)
3. Verify your prompts don't exceed model context limits
4. Check the server logs for specific error messages

The fix should resolve the chat window initialization problems by properly handling DeepInfra model context windows and token limits.
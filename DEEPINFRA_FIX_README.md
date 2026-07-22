# DeepInfra Token Limit Fix

## Problem
DeepInfra models were failing with the error:
```
"max_tokens=65536 cannot be greater than max_model_len=40960"
```

This occurred because the application was requesting 65536 tokens, which exceeds DeepInfra's maximum model length of 40960 tokens.

## Root Cause
The original fix attempt had TypeScript compilation errors that prevented it from being properly deployed:
1. Object spread approach didn't conform to LanguageModel interface
2. Direct property access attempts failed type checking
3. This caused build failures and meant fixes weren't actually deployed

## Solution Implemented
Replaced the object wrapper approach with direct method patching:

```typescript
// Save references to original methods
const originalDoStream = (baseModel as any).doStream;
const originalDoGenerate = (baseModel as any).doGenerate;

// Patch doStream method if it exists
if (originalDoStream) {
  (baseModel as any).doStream = async function(options: any) {
    // Ensure max_tokens doesn't exceed DeepInfra's limit (40960)
    if (options && options.maxTokens && options.maxTokens > 40000) {
      options.maxTokens = 40000;
    }
    return await originalDoStream.call(this, options);
  };
}

// Similar patch for doGenerate method
```

## Files Modified
1. `packages/core/src/lib/ai-provider.ts` - Main chat model provider
2. `packages/core/src/lib/deepinfra-fix.ts` - DeepInfra-specific fixes

## Verification
- ✅ Docker image builds successfully without TypeScript errors
- ✅ Container runs without "65536" errors in logs
- ✅ Health endpoint works properly
- ✅ No DeepInfra-related errors in recent logs
- ✅ Source code contains proper token limit enforcement

## Models Supported
The fix works with all DeepInfra models:
- Qwen/Qwen3-32B
- meta-llama/Meta-Llama-3.1-405B-Instruct
- meta-llama/Meta-Llama-3.1-70B-Instruct
- meta-llama/Meta-Llama-3.1-8B-Instruct
- 01-ai/Yi-1.5-34B-Chat
- deepseek-ai/DeepSeek-V3.2
- And other DeepInfra models

## Token Limit Enforcement
All DeepInfra model requests are now capped at 40,000 tokens to stay within the 40,960 limit, with a small safety margin.

## Deployment
1. Changes have been committed and pushed to the main branch
2. Docker image can be rebuilt successfully with the fixes
3. GHCR build should now succeed (once GHCR_TOKEN is configured)

## Testing
Use the test scripts in the `scripts/` directory to verify the fix:
- `test-deepinfra-token-fix.mjs` - Comprehensive model testing
- `verify-deployed-fix.mjs` - Deployment verification
- `verify-token-limit-fixes.mjs` - Source code verification
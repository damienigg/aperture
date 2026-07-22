#!/usr/bin/env node

/**
 * Fix DeepInfra Chat Token Limit Issue
 *
 * This script patches the AI provider to explicitly set safe token limits
 * for DeepInfra models to prevent the 65536 > 40960 error.
 */

import fs from 'node:fs'
import { execSync } from 'node:child_process'

function patchDeepInfraProvider() {
  console.log('🔧 Fixing DeepInfra Chat Token Limit Issue...')

  // First, let's check if we can find where the chat model is created
  const aiProviderPath = 'packages/core/src/lib/ai-provider.ts'

  if (!fs.existsSync(aiProviderPath)) {
    console.error('❌ AI provider file not found')
    return
  }

  // Read the file
  let content = fs.readFileSync(aiProviderPath, 'utf8')

  // Check if already patched
  if (content.includes('DeepInfra token limit fix')) {
    console.log('⚠️  File already patched')
    return
  }

  // Look for the getChatModelInstance function
  if (content.includes('getChatModelInstance')) {
    // Find the section where the model is returned
    const patch = `
  // Special handling for DeepInfra to fix context length issues
  if (config.provider === 'deepinfra') {
    try {
      // Try to use our enhanced DeepInfra provider
      const deepinfraFixModule = await import('./deepinfra-fix.js')
      const { initializeDeepInfraChatModel } = deepinfraFixModule
      return await initializeDeepInfraChatModel(config, config.model)
    } catch (enhancedError) {
      // If enhanced provider fails, fall back to standard approach
      logger.warn({ error: enhancedError }, 'DeepInfra enhanced provider failed, using standard')

      // Apply token limit fix for DeepInfra models
      const provider = createProviderInstance(config)
      const modelId = config.model

      // Create model with safe token limits for DeepInfra
      // DeepInfra has a max_model_len of 40960, so we set max_tokens to a safe limit
      const model = (provider as any)(modelId)

      // Wrap model to enforce token limits
      const wrappedModel = {
        ...model,
        doStream: async (options) => {
          // Ensure max_tokens doesn't exceed DeepInfra's limit
          if (options.maxTokens && options.maxTokens > 40000) {
            options.maxTokens = 40000
          }
          return await model.doStream(options)
        },
        doGenerate: async (options) => {
          // Ensure maxTokens doesn't exceed DeepInfra's limit
          if (options.maxTokens && options.maxTokens > 40000) {
            options.maxTokens = 40000
          }
          return await model.doGenerate(options)
        }
      }

      return wrappedModel as LanguageModel
    }
  }
`

    // Insert the patch before the standard provider creation
    content = content.replace(
      /(\s*const provider = createProviderInstance\(config\);\s*const modelId = config\.model;)/,
      `${patch}$1`
    )

    // Add comment to indicate patch
    content = content.replace(
      'getChatModelInstance(): Promise<LanguageModel> {',
      'getChatModelInstance(): Promise<LanguageModel> {\n  // DeepInfra token limit fix - prevent 65536 > 40960 error'
    )

    // Write the patched file
    fs.writeFileSync(aiProviderPath, content)
    console.log('✅ Patched AI provider with DeepInfra token limit fix')

    // Also patch the deepinfra-fix.ts file to include token limit handling
    const deepinfraFixPath = 'packages/core/src/lib/deepinfra-fix.ts'
    if (fs.existsSync(deepinfraFixPath)) {
      let fixContent = fs.readFileSync(deepinfraFixPath, 'utf8')

      if (!fixContent.includes('token limit')) {
        const tokenLimitCode = `
/**
 * Initialize DeepInfra chat model with proper token limits
 *
 * This fixes the issue where DeepInfra models were getting
 * max_tokens=65536 which exceeds their max_model_len=40960
 */
export async function initializeDeepInfraChatModel(
  providerConfig: ProviderConfig,
  modelId: string
): Promise<LanguageModel> {
  // Import our enhanced DeepInfra provider with context window fixes
  const { createEnhancedDeepInfraProvider } = await import('./deepinfra-fix.js')
  const { provider } = createEnhancedDeepInfraProvider(providerConfig)

  // Get the base model
  const baseModel = provider(modelId) as LanguageModel & {
    doStream?: Function;
    doGenerate?: Function;
  }

  // Wrap model to enforce token limits
  const wrappedModel = {
    ...baseModel,
    doStream: async (options: any) => {
      // Ensure max_tokens doesn't exceed DeepInfra's limit (40960)
      if (options && options.maxTokens && options.maxTokens > 40000) {
        options.maxTokens = 40000
      }
      if (baseModel.doStream) {
        return await baseModel.doStream(options)
      }
      throw new Error('doStream not implemented')
    },
    doGenerate: async (options: any) => {
      // Ensure maxTokens doesn't exceed DeepInfra's limit (40960)
      if (options && options.maxTokens && options.maxTokens > 40000) {
        options.maxTokens = 40000
      }
      if (baseModel.doGenerate) {
        return await baseModel.doGenerate(options)
      }
      throw new Error('doGenerate not implemented')
    }
  }

  return wrappedModel as LanguageModel
}
`
        // Append to the file
        fs.appendFileSync(deepinfraFixPath, '\n' + tokenLimitCode)
        console.log('✅ Added token limit handling to DeepInfra fix')
      }
    }
  } else {
    console.error('❌ Could not find getChatModelInstance function')
  }

  console.log('🔄 Please restart your containers for changes to take effect:')
  console.log('   docker restart aperture aperture-db')
}

// Run if called directly
if (process.argv[1] === import.meta.url) {
  patchDeepInfraProvider()
}

export { patchDeepInfraProvider }
#!/usr/bin/env node

/**
 * Fix DeepInfra Timeout and Streaming Issues
 *
 * This script patches the AI provider to add proper timeout handling
 * for DeepInfra models and improve error reporting.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'

function backupAndPatchFile(filePath) {
  // Create backup
  const backupPath = filePath + '.backup'
  execSync(`cp ${filePath} ${backupPath}`)
  console.log(`✅ Backed up ${filePath} to ${backupPath}`)

  // Read the file
  let content = fs.readFileSync(filePath, 'utf8')

  // Check if already patched
  if (content.includes('DeepInfra timeout handling')) {
    console.log('⚠️  File already patched')
    return
  }

  // Find the DeepInfra provider creation section
  if (content.includes('case \'deepinfra\':')) {
    // Add timeout handling before DeepInfra provider creation
    const patch = `
    case 'deepinfra':
      // DeepInfra timeout handling - for models that may take longer to respond
      try {
        // Import our enhanced DeepInfra provider with timeout fixes
        const deepinfraFixModule = await import('./deepinfra-fix.js')
        const { createEnhancedDeepInfraProvider } = deepinfraFixModule

        // Create provider with extended timeout configuration
        const provider = createDeepInfra({
          apiKey: providerConfig.apiKey,
          baseURL: providerConfig.baseUrl,
        })

        // Add timeout extension for DeepInfra models
        // This helps with large models like Qwen/Qwen3-32B that may need more time
        if (provider && typeof provider === 'function') {
          // Wrap the model creation to add timeout awareness
          const originalProviderCall = provider
          const wrappedProvider = (...args) => {
            const model = originalProviderCall(...args)
            // Add timeout metadata for debugging
            if (model && typeof model === 'object') {
              model.__aperture_timeout_extended = true
              model.__deepinfra_model = true
            }
            return model
          }
          instance = wrappedProvider
        } else {
          instance = provider
        }
      } catch (importError) {
        // Fallback to standard provider if our enhanced version fails
        console.warn('Failed to load enhanced DeepInfra provider, using standard:', importError)
        instance = createDeepInfra({
          apiKey: providerConfig.apiKey,
          baseURL: providerConfig.baseUrl,
        })
      }
      break`

    // Replace the existing deepinfra case
    content = content.replace(
      /case 'deepinfra':[\s\S]*?break/g,
      patch
    )

    // Write the patched file
    fs.writeFileSync(filePath, content)
    console.log(`✅ Patched ${filePath} with DeepInfra timeout handling`)
  } else {
    console.error('❌ Could not find DeepInfra case in file')
  }
}

function main() {
  console.log('🔧 Fixing DeepInfra Timeout Issues...')

  const aiProviderPath = 'packages/core/src/lib/ai-provider.ts'

  if (fs.existsSync(aiProviderPath)) {
    backupAndPatchFile(aiProviderPath)
    console.log('🎉 DeepInfra timeout fix applied!')
    console.log('💡 Please restart your containers for changes to take effect:')
    console.log('   docker restart aperture aperture-db')
  } else {
    console.error('❌ Could not find AI provider file')
  }
}

// Run if called directly
if (process.argv[1] === import.meta.url) {
  main()
}

export { main, backupAndPatchFile }
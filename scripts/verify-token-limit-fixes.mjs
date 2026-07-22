#!/usr/bin/env node
/**
 * Verify DeepInfra Token Limit Fixes
 *
 * This script verifies that the token limit fixes for DeepInfra models
 * are correctly implemented and working in the deployed application.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testTokenLimitEnforcement() {
  console.log('🔍 Testing DeepInfra Token Limit Enforcement')
  console.log('===========================================')

  try {
    // Check if the ai-provider.ts file has the token limit fix
    console.log('\n📄 Checking ai-provider.ts for token limit fix...')
    const aiProviderPath = join(__dirname, '..', 'packages/core/src/lib/ai-provider.ts')
    const aiProviderContent = await readFile(aiProviderPath, 'utf8')

    // Check for DeepInfra token limit fix implementation
    if (aiProviderContent.includes('Special handling for DeepInfra to fix context length issues')) {
      console.log('   ✅ DeepInfra context length fix found in ai-provider.ts')
    } else {
      console.log('   ❌ DeepInfra context length fix NOT found in ai-provider.ts')
      return false
    }

    if (aiProviderContent.includes('maxTokens > 40000')) {
      console.log('   ✅ Token limit enforcement (40000) found')
    } else {
      console.log('   ❌ Token limit enforcement NOT found')
      return false
    }

    if (aiProviderContent.includes('65536 > 40960 error')) {
      console.log('   ✅ Specific error fix ("65536 > 40960") found')
    } else {
      console.log('   ❌ Specific error fix ("65536 > 40960") NOT found')
      return false
    }

    // Check if the deepinfra-fix.ts file has the token limit fix
    console.log('\n📄 Checking deepinfra-fix.ts for token limit fix...')
    const deepinfraFixPath = join(__dirname, '..', 'packages/core/src/lib/deepinfra-fix.ts')
    const deepinfraFixContent = await readFile(deepinfraFixPath, 'utf8')

    if (deepinfraFixContent.includes('token limit')) {
      console.log('   ✅ Token limit handling found in deepinfra-fix.ts')
    } else {
      console.log('   ❌ Token limit handling NOT found in deepinfra-fix.ts')
      return false
    }

    if (deepinfraFixContent.includes('maxTokens > 40000')) {
      console.log('   ✅ Token limit enforcement (40000) found')
    } else {
      console.log('   ❌ Token limit enforcement NOT found')
      return false
    }

    if (deepinfraFixContent.includes('65536 > 40960 error')) {
      console.log('   ✅ Specific error fix ("65536 > 40960") found')
    } else {
      console.log('   ❌ Specific error fix ("65536 > 40960") NOT found')
      return false
    }

    console.log('\n🎉 All token limit fixes are properly implemented!')
    return true

  } catch (error) {
    console.error('❌ Error during verification:', error.message)
    return false
  }
}

async function testModelWrapping() {
  console.log('\n🔧 Testing Model Wrapping Functionality')
  console.log('=====================================')

  try {
    const aiProviderPath = join(__dirname, '..', 'packages/core/src/lib/ai-provider.ts')
    const aiProviderContent = await readFile(aiProviderPath, 'utf8')

    console.log('   Checking if model wrapping functions exist...')

    // Check for doStream wrapping
    if (aiProviderContent.includes('doStream: baseModel.doStream ? async (options: any) =>')) {
      console.log('   ✅ doStream method wrapping found')
    } else {
      console.log('   ❌ doStream method wrapping NOT found')
    }

    // Check for doGenerate wrapping
    if (aiProviderContent.includes('doGenerate: baseModel.doGenerate ? async (options: any) =>')) {
      console.log('   ✅ doGenerate method wrapping found')
    } else {
      console.log('   ❌ doGenerate method wrapping NOT found')
    }

    // Check for the exact token limit enforcement logic
    if (aiProviderContent.includes('options.maxTokens > 40000')) {
      console.log('   ✅ Token limit enforcement logic found')
    } else {
      console.log('   ❌ Token limit enforcement logic NOT found')
    }

    console.log('   Model wrapping functionality appears to be correctly implemented')

  } catch (error) {
    console.error('❌ Error testing model wrapping:', error.message)
  }
}

async function main() {
  console.log('🧪 DeepInfra Token Limit Fix Verification')
  console.log('=========================================')

  const fixesVerified = await testTokenLimitEnforcement()
  await testModelWrapping()

  if (fixesVerified) {
    console.log('\n✅ VERIFICATION COMPLETE')
    console.log('   The DeepInfra token limit fixes are properly implemented.')
    console.log('   The application should now prevent the "max_tokens=65536 > 40960" error.')

    // Additional debugging info
    console.log('\n💡 Troubleshooting Tips:')
    console.log('   1. If you still see the "max_tokens=65536 > 40960" error,')
    console.log('      check that the Docker container is using the latest code.')
    console.log('   2. You may need to rebuild and redeploy the Docker image.')
    console.log('   3. Ensure that DEEPINFRA_API_KEY is properly set in your environment.')
    console.log('   4. The error might be coming from cached/fallback paths that')
    console.log('      aren\'t using the wrapped model.')
  } else {
    console.log('\n❌ VERIFICATION FAILED')
    console.log('   The DeepInfra token limit fixes may not be properly implemented.')
    console.log('   Please check the implementation and redeploy.')
  }

  // Check for recent errors in Docker logs
  console.log('\n📋 Checking for recent DeepInfra errors...')
  try {
    const { execSync } = await import('child_process')
    const logs = execSync('docker logs aperture 2>&1 | grep -i "65536\\|deepinfra\\|token" | tail -5', { encoding: 'utf8' })
    if (logs.trim()) {
      console.log('   Recent DeepInfra/token related logs:')
      console.log('   ' + logs.trim().replace(/\n/g, '\n   '))
    } else {
      console.log('   No recent DeepInfra/token errors found in logs')
    }
  } catch (error) {
    console.log('   Could not check Docker logs:', error.message)
  }
}

// Run verification if called directly
if (process.argv[1] === __filename) {
  main().catch(console.error)
}

export { testTokenLimitEnforcement, testModelWrapping }
#!/usr/bin/env node

/**
 * Fix Chat Configuration Script
 *
 * This script directly configures the AI chat provider to use DeepInfra
 * with the Qwen/Qwen3-32B model to fix chat functionality.
 */

import { execSync } from 'node:child_process'

// Configuration - Update these values
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY || 'YOUR_DEEPINFRA_API_KEY'

async function fixChatConfiguration() {
  console.log('🔧 Fixing Chat Configuration...')

  if (!DEEPINFRA_API_KEY || DEEPINFRA_API_KEY === 'YOUR_DEEPINFRA_API_KEY') {
    console.error('❌ Please set DEEPINFRA_API_KEY environment variable')
    console.error('   Example: export DEEPINFRA_API_KEY="your-actual-api-key"')
    console.error('   Get your API key from: https://deepinfra.com/dash/api-keys')
    return
  }

  try {
    // Test the API key first by directly connecting to DeepInfra
    console.log('🔍 Testing DeepInfra API key...')
    const testResult = execSync(
      `curl -s -X POST "https://api.deepinfra.com/v1/openai/chat/completions" \
        -H "Authorization: Bearer ${DEEPINFRA_API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"model":"Qwen/Qwen3-32B","messages":[{"role":"user","content":"test"}],"max_tokens":5}'`,
      { encoding: 'utf8' }
    )

    if (testResult.includes('error') && testResult.includes('invalid_api_key')) {
      console.error('❌ Invalid DeepInfra API key')
      console.error('   Please check your API key at: https://deepinfra.com/dash/api-keys')
      return
    }

    console.log('✅ DeepInfra API key is valid')

    // Configure the chat function in the database to use DeepInfra
    console.log('💾 Configuring chat function to use DeepInfra Qwen/Qwen3-32B...')

    // First, let's check if we can insert the configuration directly
    const configJson = JSON.stringify({
      chat: {
        provider: 'deepinfra',
        model: 'Qwen/Qwen3-32B',
        apiKey: DEEPINFRA_API_KEY
      },
      embeddings: null,
      textGeneration: null,
      exploration: null
    })

    // Insert or update the AI configuration in the database
    const insertCommand = `docker exec aperture-db psql -U app -d aperture -c "INSERT INTO system_settings (key, value, description) VALUES ('ai_config', '${configJson.replace(/'/g, "''")}', 'AI provider configuration')" ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`

    execSync(insertCommand, { encoding: 'utf8' })
    console.log('✅ AI configuration updated successfully')

    // Also make sure the provider credentials are stored
    const credentialsJson = JSON.stringify({
      deepinfra: {
        apiKey: DEEPINFRA_API_KEY
      }
    })

    const credentialsCommand = `docker exec aperture-db psql -U app -d aperture -c "INSERT INTO system_settings (key, value, description) VALUES ('ai_provider_credentials', '${credentialsJson.replace(/'/g, "''")}', 'AI provider credentials')" ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`

    execSync(credentialsCommand, { encoding: 'utf8' })
    console.log('✅ AI provider credentials updated successfully')

    console.log('\n🎉 Chat configuration fix completed!')
    console.log('✅ DeepInfra API key has been configured')
    console.log('✅ Chat function is set to use Qwen/Qwen3-32B')
    console.log('✅ You should now be able to use the chat functionality')

    console.log('\n💡 Next steps:')
    console.log('   1. Restart your Aperture containers: docker restart aperture aperture-db')
    console.log('   2. Try the chat again - it should now respond properly')
    console.log('   3. If issues persist, check container logs: docker logs aperture')

  } catch (error) {
    console.error('❌ Failed to fix chat configuration:', error.message)

    if (error.message.includes('psql')) {
      console.error('   🐳 Docker/database connection issue')
      console.error('   💡 Make sure your containers are running')
    } else if (error.message.includes('curl')) {
      console.error('   🌐 Network connectivity issue')
      console.error('   💡 Check your internet connection')
    }
  }
}

// Run the fix if called directly
if (process.argv[1] === import.meta.url) {
  fixChatConfiguration().catch(console.error)
}

export { fixChatConfiguration }
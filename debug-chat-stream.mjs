#!/usr/bin/env node

/**
 * Debug Chat Stream Issues
 *
 * This script helps diagnose why the chat isn't responding by testing
 * the streaming functionality directly.
 */

import { createDeepInfra } from '@ai-sdk/deepinfra'
import { streamText } from 'ai'

// Test with your configured API key
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY || 'test-key'

async function debugChatStream() {
  console.log('🔍 Debugging Chat Stream Issues...')

  try {
    console.log('🔧 Creating DeepInfra provider...')
    const deepinfra = createDeepInfra({
      apiKey: DEEPINFRA_API_KEY,
      baseURL: 'https://api.deepinfra.com/v1'
    })

    console.log('🤖 Creating Qwen/Qwen3-32B model...')
    const model = deepinfra('Qwen/Qwen3-32B')

    console.log('💬 Testing streaming with simple prompt...')

    // Test with a very simple prompt to see if we get any response
    const stream = await streamText({
      model,
      prompt: 'Say "test successful" and nothing else.',
      maxTokens: 20,
      temperature: 0.1
    })

    console.log('🔄 Streaming response...')

    // Try to consume the stream
    let response = ''
    for await (const chunk of stream.textStream) {
      response += chunk
      console.log(' Got chunk:', chunk)
      if (response.length > 100) {
        console.log('⚠️  Response getting long, stopping...')
        break
      }
    }

    console.log('✅ Stream completed successfully!')
    console.log('📝 Full response:', response)

  } catch (error) {
    console.error('❌ Streaming test failed:')
    console.error('   Name:', error.name)
    console.error('   Message:', error.message)
    console.error('   Stack:', error.stack)

    // Check for specific error patterns
    if (error.message.includes('timeout')) {
      console.error('   ⏱️  This is a timeout issue - the model might be taking too long to respond')
    } else if (error.message.includes('stream')) {
      console.error('   🌊 This is a stream handling issue')
    } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
      console.error('   🔐 Authentication issue with the API key')
    } else if (error.message.includes('context') || error.message.includes('token')) {
      console.error('   📏 Context or token limit issue')
    }

    // Check if this is related to the model specification version
    if (error.message.includes('specification') || error.message.includes('v1.0.49')) {
      console.error('   🔄 This might be related to the DeepInfra model specification version')
      console.error('   💡 Consider upgrading @ai-sdk/deepinfra package')
    }
  }
}

// Run the debug if called directly
if (process.argv[1] === import.meta.url) {
  debugChatStream().catch(console.error)
}

export { debugChatStream }
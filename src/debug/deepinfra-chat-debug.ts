#!/usr/bin/env node
/**
 * Debug script to test DeepInfra chat model initialization and context length issues
 *
 * This script tests the DeepInfra provider integration to identify issues with
 * context window length and token handling that might cause chat window initialization problems.
 */

import { createDeepInfra } from '@ai-sdk/deepinfra'
import { generateText } from 'ai'

// Test configuration - replace with your actual API key
const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY || 'YOUR_DEEPINFRA_API_KEY'

// DeepInfra models with known context window sizes
const DEEPINFRA_MODELS = [
  {
    id: 'Qwen/Qwen3-32B',
    name: 'Qwen3 32B',
    contextWindow: 40000,
    description: 'Fast, very cost-effective Qwen3 model for general chat and tool use.'
  },
  {
    id: 'deepseek-ai/DeepSeek-V3.2',
    name: 'DeepSeek V3.2',
    contextWindow: 160000,
    description: 'Excellent price/performance model with tool calling support.'
  },
  {
    id: 'deepseek-ai/DeepSeek-V4-Pro',
    name: 'DeepSeek V4 Pro',
    contextWindow: 1000000,
    description: 'DeepSeek\'s high-quality flagship model with strong reasoning.'
  }
]

async function testModelInitialization() {
  console.log('Testing DeepInfra model initialization...\n')

  for (const modelInfo of DEEPINFRA_MODELS) {
    console.log(`Testing model: ${modelInfo.name} (${modelInfo.id})`)
    console.log(`Context window: ${modelInfo.contextWindow} tokens`)

    try {
      // Create DeepInfra provider instance
      const deepinfra = createDeepInfra({
        apiKey: DEEPINFRA_API_KEY
      })

      // Create model instance
      const model = deepinfra(modelInfo.id)

      // Test basic generation to verify initialization
      console.log('  Testing basic text generation...')
      const result = await generateText({
        model,
        prompt: 'Say "Hello, world!" and nothing else.',
        maxTokens: 20,
        temperature: 0.1
      })

      console.log(`  ✓ Success: ${result.text}`)
      console.log(`  ✓ Tokens used: ${result.usage?.totalTokens || 'unknown'}`)

    } catch (error) {
      console.error(`  ✗ Error with ${modelInfo.name}:`, error instanceof Error ? error.message : error)

      // Check for specific error patterns related to context length
      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase()
        if (errorStr.includes('context') || errorStr.includes('token') || errorStr.includes('length')) {
          console.log(`    This appears to be a context/token length issue.`)
        }
      }
    }

    console.log('')
  }
}

async function testContextWindowHandling() {
  console.log('Testing context window handling...\n')

  // Test with a model that has a large context window
  const modelId = 'deepseek-ai/DeepSeek-V3.2'
  console.log(`Testing context window with model: ${modelId}`)

  try {
    const deepinfra = createDeepInfra({
      apiKey: DEEPINFRA_API_KEY
    })

    const model = deepinfra(modelId)

    // Test with a long prompt to check context window limits
    const longPrompt = 'Hello. '.repeat(10000) + 'What model are you?'

    console.log(`  Testing with prompt of ${longPrompt.length} characters...`)

    const result = await generateText({
      model,
      prompt: longPrompt,
      maxTokens: 50,
      temperature: 0.1
    })

    console.log(`  ✓ Success with long prompt: ${result.text.substring(0, 100)}...`)

  } catch (error) {
    console.error(`  ✗ Error with long prompt:`, error instanceof Error ? error.message : error)

    // Check if this is related to context window issues
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase()
      if (errorStr.includes('context') || errorStr.includes('token') || errorStr.includes('length')) {
        console.log(`    This confirms a context/token length issue with the model.`)
      }
    }
  }
}

async function main() {
  console.log('DeepInfra Chat Model Debug Script')
  console.log('==================================\n')

  if (!DEEPINFRA_API_KEY || DEEPINFRA_API_KEY === 'YOUR_DEEPINFRA_API_KEY') {
    console.error('Please set DEEPINFRA_API_KEY environment variable')
    process.exit(1)
  }

  try {
    await testModelInitialization()
    await testContextWindowHandling()

    console.log('Debug script completed.')
  } catch (error) {
    console.error('Script failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the debug script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { testModelInitialization, testContextWindowHandling }
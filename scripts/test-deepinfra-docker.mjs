#!/usr/bin/env node
/**
 * Docker-based DeepInfra integration test script
 *
 * Usage:
 *   node scripts/test-deepinfra-docker.mjs
 *
 * What it does:
 *   1. Verifies the current git branch.
 *   2. Ensures .env.local has the minimum required variables.
 *   3. Builds and starts the app + database via Docker Compose.
 *   4. Waits for the API to become healthy.
 *   5. Prints the URL and next steps.
 *
 * The app is reachable at the APP_BASE_URL you configure (default: http://localhost:3456).
 */

import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const ENV_FILE = path.join(ROOT, '.env.local')

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

const log = {
  step: (msg) => console.log(`${COLORS.cyan}▶ ${msg}${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✓ ${msg}${COLORS.reset}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}✗ ${msg}${COLORS.reset}`),
}

async function currentBranch() {
  const result = await new Promise((resolve, reject) => {
    let out = ''
    const child = spawn('git', ['branch', '--show-current'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (d) => (out += d.toString()))
    child.on('close', (code) => {
      if (code !== 0) reject(new Error('git branch failed'))
      else resolve(out.trim())
    })
  })
  return result
}

async function readEnvFile() {
  try {
    return await fs.readFile(ENV_FILE, 'utf-8')
  } catch {
    return ''
  }
}

async function ensureEnvFile() {
  const contents = await readEnvFile()

  const hasDatabaseUrl = contents.includes('DATABASE_URL=')
  const hasSessionSecret = contents.includes('SESSION_SECRET=')
  const hasAppBaseUrl = contents.includes('APP_BASE_URL=')

  if (hasDatabaseUrl && hasSessionSecret && hasAppBaseUrl) {
    log.success('.env.local looks complete')
    return contents
  }

  log.warn('.env.local missing or incomplete; appending defaults.')

  const secret = [...Array(32)]
    .map(() => Math.random().toString(36).charAt(2))
    .join('')

  const additions = []
  if (!hasAppBaseUrl) {
    additions.push(`APP_BASE_URL=http://localhost:3456`)
  }
  if (!hasDatabaseUrl) {
    additions.push(`DATABASE_URL=postgres://app:app@db:5432/aperture`)
  }
  if (!hasSessionSecret) {
    additions.push(`SESSION_SECRET=${secret}`)
  }

  const newContents = contents.trim() + '\n\n' + additions.join('\n') + '\n'
  await fs.writeFile(ENV_FILE, newContents)
  log.success('Updated .env.local with required defaults')
  return newContents
}

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...opts.env },
      ...opts.spawnOptions,
    })
    child.on('close', (code) => {
      if (code !== 0 && !opts.ignoreExitCode) {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`))
      } else {
        resolve(code)
      }
    })
  })
}

async function waitForHealth(baseUrl, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`)
      if (res.ok) return
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`API did not become healthy within ${timeoutMs}ms`)
}

async function extractAppBaseUrl() {
  const contents = await readEnvFile()
  const match = contents.match(/APP_BASE_URL=(.+)/)
  return match ? match[1].trim() : 'http://localhost:3456'
}

async function main() {
  console.log(`\n${COLORS.cyan}=== Aperture DeepInfra Docker Test ===${COLORS.reset}\n`)

  const branch = await currentBranch()
  log.step(`Current branch: ${branch}`)
  if (branch !== 'feature/deepinfra-provider') {
    log.warn('You are not on feature/deepinfra-provider. Run:')
    log.warn('  git checkout feature/deepinfra-provider')
    process.exit(1)
  }

  await ensureEnvFile()

  log.step('Bringing Docker Compose up and rebuilding the image...')
  await run('npx', ['pnpm@10.0.0', 'docker:up'])

  const appUrl = await extractAppBaseUrl()
  log.step(`Waiting for ${appUrl}/health ...`)
  try {
    await waitForHealth(appUrl)
  } catch (err) {
    log.error(err.message)
    log.warn('You can inspect logs with: npx pnpm@10.0.0 docker:logs')
    process.exit(1)
  }

  log.success('Docker stack is healthy.')
  log.step(`Open ${appUrl} and complete the setup if this is a fresh database.`)
  log.step('Then go to Settings → AI and select DeepInfra for each function.')
  log.step('To stop: npx pnpm@10.0.0 docker:down')
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

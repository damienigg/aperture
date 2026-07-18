#!/usr/bin/env node
/**
 * Local DeepInfra integration test script
 *
 * Usage:
 *   node scripts/test-deepinfra-local.mjs
 *
 * What it does:
 *   1. Verifies the current git branch.
 *   2. Ensures the .env.local file exists with required keys.
 *   3. Starts the Docker database.
 *   4. Installs dependencies.
 *   5. Builds packages.
 *   6. Runs migrations (including the 2560D tables).
 *   7. Starts the API and web dev servers.
 *
 * After running, open http://localhost:3457 and go to Settings → AI to select DeepInfra.
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

async function ensureEnvFile() {
  try {
    await fs.access(ENV_FILE)
    log.success('.env.local exists')
    const contents = await fs.readFile(ENV_FILE, 'utf-8')
    if (!contents.includes('DATABASE_URL=') || !contents.includes('SESSION_SECRET=')) {
      throw new Error('missing keys')
    }
  } catch {
    log.warn('.env.local missing or incomplete; creating a default one.')
    const secret = [...Array(32)]
      .map(() => Math.random().toString(36).charAt(2))
      .join('')
    await fs.writeFile(
      ENV_FILE,
      `DATABASE_URL=postgres://app:app@localhost:5432/aperture\nSESSION_SECRET=${secret}\n`
    )
    log.success(`Created .env.local with generated SESSION_SECRET`)
  }
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

async function main() {
  console.log(`\n${COLORS.cyan}=== Aperture DeepInfra Local Test ===${COLORS.reset}\n`)

  const branch = await currentBranch()
  log.step(`Current branch: ${branch}`)
  if (branch !== 'feature/deepinfra-provider') {
    log.warn('You are not on feature/deepinfra-provider. Run:')
    log.warn('  git checkout feature/deepinfra-provider')
    process.exit(1)
  }

  await ensureEnvFile()

  log.step('Starting Docker database (this may take a moment)...')
  await run('npx', ['pnpm@10.0.0', 'docker:db'])

  // Give postgres a moment to become ready
  log.step('Waiting for database to be ready...')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  log.step('Installing dependencies...')
  await run('npx', ['pnpm@10.0.0', 'install'])

  log.step('Building packages...')
  await run('npx', ['pnpm@10.0.0', '--filter', './packages/*', 'run', 'build'])

  log.step('Running migrations...')
  await run('npx', ['pnpm@10.0.0', 'db:migrate'])

  log.success('Setup complete. Starting dev servers...')
  log.step('Open http://localhost:3457 and go to Settings → AI to configure DeepInfra.')
  log.step('Press Ctrl+C to stop.')

  // Start dev servers in foreground
  await run('npx', ['pnpm@10.0.0', 'dev'], {
    env: { NODE_ENV: 'development' },
  })
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

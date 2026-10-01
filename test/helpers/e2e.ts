import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from 'node:http'
import { execSync } from 'node:child_process'
import { createServer, request as httpRequest } from 'node:http'
import { afterAll, beforeAll } from 'vitest'
import { setup, url, useTestContext } from '@nuxt/test-utils/e2e'

/**
 * The harness every `test/e2e` spec shares: a fake Django on a random
 * port, a REAL Nuxt dev server pointed at it, and a request helper that
 * can set the `Host` header.
 *
 * Why `node:http` and `.localhost` hosts:
 *
 * - Node's global `fetch()` (undici) silently drops an explicit `Host`
 *   header — it is on WHATWG's forbidden-header list — so the helpers
 *   `@nuxt/test-utils/e2e` ships cannot address a tenant. `node:http`
 *   has no such restriction.
 * - Vite's dev server rejects unknown hosts unless they end in
 *   `.localhost` (RFC 6761), which it trusts unconditionally
 *   (`isHostAllowedInternal`). `setup({ dev: true })` spawns `nuxi _dev`
 *   as a CLI subprocess that reads `nuxt.config.ts` and the env only —
 *   the `nuxtConfig` option never reaches it — so `server.allowedHosts`
 *   cannot be injected, and `.localhost` sidesteps the check instead.
 */

export interface HostResponse {
  statusCode: number
  body: string
  headers: IncomingHttpHeaders
  location?: string
}

/** GET `path` on the dev server as `host`. Redirects are NOT followed. */
export function requestWithHost(
  path: string,
  host: string,
  headers: Record<string, string> = {},
): Promise<HostResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url(path))
    const req = httpRequest(target, { headers: { Host: host, ...headers } }, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString()
      })
      res.on('end', () =>
        resolve({
          statusCode: res.statusCode ?? 0,
          body,
          headers: res.headers,
          location: res.headers.location,
        }),
      )
    })
    req.on('error', reject)
    req.end()
  })
}

/** A browser's `Accept` — without it the error handler answers JSON on purpose. */
export const BROWSER_ACCEPT = { Accept: 'text/html,application/xhtml+xml' }

export type FakeDjangoHandler = (req: IncomingMessage, res: ServerResponse, url: URL) => void

/** Answer `body` as JSON with `status`. */
export function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/**
 * Start the stand-in for Django on a free port. It is closed by the
 * `afterAll` that {@link setupDevServer} registers.
 */
export async function startFakeDjango(handler: FakeDjangoHandler): Promise<{ server: Server, port: number }> {
  const server = createServer((req, res) => handler(req, res, new URL(req.url ?? '/', 'http://internal')))
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('fake Django server did not bind to a TCP port')
  }
  return { server, port: address.port }
}

/**
 * Boot the dev server against the fake Django, and tear both down.
 * Call it from a `describe` callback, like `setup()` itself.
 *
 * `env` is added to the variables every boot needs: the API URLs, an
 * in-memory cache (deterministic whether or not a Redis is reachable,
 * and no cross-run pollution through a shared one), and the two
 * secrets `server/plugins/startup-validation.ts` refuses to boot
 * without — nothing here exercises either, they only have to exist.
 *
 * Windows orphan guard: test-utils spawns `nuxi _dev` through a shell
 * shim and its `stopServer()` kills only that wrapper, so the real
 * `node nuxt.mjs _dev` grandchild survives, keeps @nuxt/cli's dev-server
 * lock, and the NEXT run dies with "Another Nuxt dev server is already
 * running" (nuxt/test-utils#948 lineage). So the whole process tree is
 * killed here, whether or not the boot succeeded.
 */
export async function setupDevServer(
  fakeDjango: { server: Server, port: number },
  env: Record<string, string> = {},
): Promise<void> {
  // The dev server's pid, captured WHILE it boots. test-utils records
  // the process before it waits for readiness, but its test context is
  // gone by the time an `afterAll` runs, and a hook after `setup()` is
  // never reached when the boot fails — while a server left behind by a
  // FAILED boot is exactly the one that blocks the next run.
  let devServerPid: number | undefined
  let bootStartedAt = 0
  let pidWatch: ReturnType<typeof setInterval> | undefined
  beforeAll(() => {
    bootStartedAt = Date.now()
    pidWatch = setInterval(() => {
      devServerPid ??= serverPid()
      if (devServerPid) clearInterval(pidWatch)
    }, 200)
  })

  await setup({
    rootDir: '.',
    dev: true,
    server: true,
    browser: false,
    setupTimeout: 240000,
    serverStartTimeout: 240000,
    env: {
      NUXT_API_BASE_URL: `http://127.0.0.1:${fakeDjango.port}/api/v1`,
      NUXT_DJANGO_URL: `http://127.0.0.1:${fakeDjango.port}`,
      NUXT_CACHE_BASE: 'memory',
      NUXT_SESSION_PASSWORD: 'e2e-test-session-password-32-chars-minimum-abcdef',
      ...env,
    },
  })

  // A second `beforeAll` on purpose: hooks run in registration order,
  // so this one runs after the boot hooks `setup()` just registered and
  // the first one ran before them. One hook cannot sit on both sides.
  // eslint-disable-next-line vitest/no-duplicate-hooks -- the order around setup()'s hooks is the point
  beforeAll(() => {
    devServerPid ??= serverPid()
    // The boot time is what the 240s setup budget above is tuned against.
    // eslint-disable-next-line no-console -- the e2e run reports it, like a CLI script
    console.info(`[e2e] dev server booted in ${Date.now() - bootStartedAt}ms`)
  })

  afterAll(() => {
    clearInterval(pidWatch)
    fakeDjango.server.close()
    if (process.platform === 'win32' && devServerPid) killTree(devServerPid)
  })
}

/** The dev server's pid, once test-utils has spawned it. */
function serverPid(): number | undefined {
  try {
    return useTestContext().serverProcess?.pid
  }
  catch {
    // No test context yet (or any more).
    return undefined
  }
}

/**
 * Kill `pid` and everything under it. Walks the tree by parent pid
 * first, because by the time this runs test-utils may already have
 * killed the shell shim — and `taskkill /T` cannot find the children of
 * a process that no longer exists, while their parent-pid entries still
 * name it.
 */
function killTree(pid: number): void {
  const children = (parent: number): number[] => {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parent}' | ForEach-Object { $_.ProcessId }"`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      )
      return out.split(/\s+/).filter(Boolean).map(Number)
    }
    catch {
      return []
    }
  }
  const tree: number[] = []
  const queue = [pid]
  while (queue.length) {
    const next = queue.shift()!
    tree.push(next)
    queue.push(...children(next))
  }
  for (const member of tree.reverse()) {
    try {
      execSync(`taskkill /pid ${member} /T /F`, { stdio: 'ignore' })
    }
    catch {
      // Already gone — exactly what we want.
    }
  }
}

/**
 * Wait until `path` answers 200. Dev mode compiles routes on the FIRST
 * request that touches them, so a cold hit can transiently 500; the last
 * response is surfaced if it never becomes ready, so a real failure is
 * not reported as a cold start.
 */
export async function waitUntilServing(path: string, host: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let last: HostResponse | undefined
  while (Date.now() < deadline) {
    last = await requestWithHost(path, host)
    if (last.statusCode === 200) return
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`${path} never became ready: ${last?.statusCode} ${last?.body.slice(0, 800)}`)
}

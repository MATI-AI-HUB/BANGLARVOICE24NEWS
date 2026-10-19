import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

async function loadHeaders() {
  const config = require('../next.config.js')
  const rules = await config.headers()
  const entries: Array<{ key: string; value: string }> = rules[0].headers
  return Object.fromEntries(entries.map((h) => [h.key, h.value]))
}

describe('security headers', () => {
  it('applies to every route', async () => {
    const config = require('../next.config.js')
    const rules = await config.headers()
    expect(rules[0].source).toBe('/:path*')
  })

  it('sets baseline hardening headers', async () => {
    const headers = await loadHeaders()
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Strict-Transport-Security']).toContain('max-age=')
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(headers['Permissions-Policy']).toContain('camera=()')
  })

  it('ships CSP as report-only, never enforcing, and blocks plugins', async () => {
    const headers = await loadHeaders()
    expect(headers['Content-Security-Policy']).toBeUndefined()
    const csp = headers['Content-Security-Policy-Report-Only']
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain('https://www.youtube-nocookie.com')
  })
})

import { describe, expect, it } from 'vitest'

function robotsPathAllowed(robotsTxt: string, path: string) {
  const lines = robotsTxt.split(/\r?\n/)
  let inStar = false
  const disallows: string[] = []
  const allows: string[] = []
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const ua = /^user-agent:\s*(.*)$/i.exec(line)
    if (ua) {
      const agent = ua[1].trim()
      inStar = agent === '*' || /banglarvoice/i.test(agent)
      continue
    }
    if (!inStar) continue
    const dis = /^disallow:\s*(.*)$/i.exec(line)
    if (dis) {
      disallows.push(dis[1].trim())
      continue
    }
    const allow = /^allow:\s*(.*)$/i.exec(line)
    if (allow) allows.push(allow[1].trim())
  }
  const blocked = disallows.some((rule) => rule && path.startsWith(rule))
  const allowed = allows.some((rule) => rule && path.startsWith(rule))
  if (allowed) return true
  return !blocked
}

describe('robots path checks', () => {
  it('blocks only matching paths, not the whole origin', () => {
    const txt = 'User-agent: *\nDisallow: /premium/\nAllow: /news/'
    expect(robotsPathAllowed(txt, '/premium/secret')).toBe(false)
    expect(robotsPathAllowed(txt, '/news/world')).toBe(true)
    expect(robotsPathAllowed(txt, '/sport')).toBe(true)
  })
})

/**
 * The path-derivation helpers exist because 0.1.5-rc.1 removed
 * `SessionPersistence.locate()`, so the trash feature derives a session's log
 * directory itself. They mirror the JSONL backend's naming, which makes them
 * the plugin's most silently-breakable logic: pin the exact encoding here.
 */
import { describe, expect, it } from 'vitest'
import { encodeSegment, projectKey, sessionLogDir } from '../src/index.js'

describe('encodeSegment', () => {
  it('leaves an ordinary session id untouched', () => {
    expect(encodeSegment('session-abc-123')).toBe('session-abc-123')
  })

  it('escapes the dot segments', () => {
    expect(encodeSegment('.')).toBe('~002E')
    expect(encodeSegment('..')).toBe('~002E~002E')
  })

  it('escapes a space as its uppercase UTF-16 code unit', () => {
    expect(encodeSegment('a b')).toBe('a~0020b')
  })

  it('escapes non-ASCII as ~XXXX', () => {
    // '实现' — the same escaping the JSONL backend writes into project dirs.
    expect(encodeSegment('实现')).toBe('~5B9E~73B0')
  })
})

describe('projectKey', () => {
  it('collapses separators to single dashes and wraps in --', () => {
    expect(projectKey('/Users/zhonglin/Desktop/lab/investment'))
      .toBe('--Users-zhonglin-Desktop-lab-investment--')
  })

  it('keeps dot-directories readable', () => {
    expect(projectKey('/Users/zhonglin/Desktop/homelab/hello-ci/.dsh/wt-ci-debug'))
      .toBe('--Users-zhonglin-Desktop-homelab-hello-ci-.dsh-wt-ci-debug--')
  })

  it('escapes non-ASCII segments', () => {
    expect(projectKey('/a/实现发布')).toBe('--a-~5B9E~73B0~53D1~5E03--')
  })

  it('falls back to `root` when nothing readable remains', () => {
    expect(projectKey('///')).toBe('--root--')
  })
})

describe('sessionLogDir', () => {
  it('composes project key + encoded id', () => {
    const dir = sessionLogDir('session-abc-123', '/Users/x/proj')
    expect(dir.endsWith('--Users-x-proj--/session-abc-123')).toBe(true)
  })

  it('uses the backend _no-cwd bucket for a session without a working directory', () => {
    const dir = sessionLogDir('session-abc', undefined)
    expect(dir.endsWith('_no-cwd/session-abc')).toBe(true)
  })

  it('encodes an id that carries a composite surface suffix', () => {
    const id = 'session-11111111-2222-3333-4444-555555555555-surface-66666666-7777-8888-9999-000000000000'
    expect(sessionLogDir(id, '/tmp/x').endsWith(`--tmp-x--/${id}`)).toBe(true)
  })
})

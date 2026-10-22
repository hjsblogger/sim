import { describe, expect, it } from 'vitest'
import { formatTestMuError } from '@/lib/internal/testmu/client'

const ACCESS_KEY = 'LT_s3cr3t+key/=='
const ENDPOINT = `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(
  JSON.stringify({ 'LT:Options': { user: 'jane', accessKey: ACCESS_KEY } })
)}`

describe('formatTestMuError', () => {
  it('reports rejected credentials without the call log', () => {
    // Shape returned by cdp.lambdatest.com for a bad access key.
    const message = [
      'connect: WebSocket error: wss://cdp.lambdatest.com/playwright 401 Unauthorized',
      '{"status":401,"value":{"message":"Unauthorized, either Username or AccessKey is invalid"}}',
      '',
      'Call log:',
      '\u001b[2m  - <ws connecting> wss://cdp.lambdatest.com/playwright\u001b[22m',
    ].join('\n')

    expect(formatTestMuError(message, ACCESS_KEY)).toBe(
      'TestMu AI rejected the username or access key (401 Unauthorized)'
    )
  })

  it('redacts an endpoint or key quoted in other errors and drops the call log', () => {
    const message = [
      `page.goto: net::ERR_NAME_NOT_RESOLVED key=${ACCESS_KEY}`,
      'Call log:',
      `  - <ws connecting> ${ENDPOINT}`,
    ].join('\n')

    const formatted = formatTestMuError(message, ACCESS_KEY)

    expect(formatted).toBe('page.goto: net::ERR_NAME_NOT_RESOLVED key=[REDACTED]')
    expect(formatTestMuError(`<ws error> ${ENDPOINT}`, ACCESS_KEY)).not.toContain(
      encodeURIComponent(ACCESS_KEY)
    )
  })
})

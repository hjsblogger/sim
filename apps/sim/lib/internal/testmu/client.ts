import { createLogger } from '@sim/logger'
import { toError } from '@sim/utils/errors'
import type { Browser, Page } from 'playwright-core'

const logger = createLogger('TestMuClient')

/**
 * TestMu AI (LambdaTest) cloud Playwright endpoint. Capabilities, including the
 * account credentials, travel in the `capabilities` query parameter:
 * https://www.lambdatest.com/support/docs/playwright-testing/
 */
const TESTMU_PLAYWRIGHT_ENDPOINT = 'wss://cdp.lambdatest.com/playwright'

const ENDPOINT_PATTERN = /wss:\/\/cdp\.lambdatest\.com\/playwright\?capabilities=\S+/g
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g

/**
 * Turns a Playwright error into a message safe to return. The endpoint carries
 * the access key, so it and the key are redacted even though current
 * Playwright versions already drop the query string from their call log.
 */
export function formatTestMuError(message: string, accessKey: string): string {
  let formatted = message
    .replace(ENDPOINT_PATTERN, `${TESTMU_PLAYWRIGHT_ENDPOINT}?capabilities=[REDACTED]`)
    .replace(ANSI_PATTERN, '')
  if (accessKey) {
    for (const form of new Set([accessKey, encodeURIComponent(accessKey)])) {
      formatted = formatted.split(form).join('[REDACTED]')
    }
  }
  if (/\b401 Unauthorized\b/.test(formatted)) {
    return 'TestMu AI rejected the username or access key (401 Unauthorized)'
  }
  const [summary = ''] = formatted.split('\nCall log:')
  return summary.trim()
}

export interface TestMuSession {
  page: Page
  run<T>(operation: Promise<T>): Promise<T>
  close(result: { passed: boolean; remark: string }): Promise<void>
}

function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  if (!signal) return operation
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      callback()
    }
    const onAbort = () => {
      finish(() => reject(toError(signal.reason ?? new Error('Aborted'))))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      onAbort()
      return
    }
    operation.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error))
    )
  })
}

/** Marks the session passed or failed in the TestMu AI automation dashboard. */
async function setTestStatus(page: Page, passed: boolean, remark: string): Promise<void> {
  const action = {
    action: 'setTestStatus',
    arguments: { status: passed ? 'passed' : 'failed', remark: remark.slice(0, 255) },
  }
  await page.evaluate(() => {}, `lambdatest_action: ${JSON.stringify(action)}`)
}

export async function createTestMuSession({
  username,
  accessKey,
  buildName,
  testName,
  headless,
  connectTimeoutMs,
  signal,
}: {
  username: string
  accessKey: string
  buildName: string
  testName: string
  headless?: boolean
  connectTimeoutMs: number
  signal?: AbortSignal
}): Promise<TestMuSession> {
  signal?.throwIfAborted()
  const capabilities = {
    browserName: 'Chrome',
    browserVersion: 'latest',
    'LT:Options': {
      platform: 'Windows 11',
      build: buildName,
      name: testName,
      user: username,
      accessKey,
      video: true,
      console: true,
      ...(headless !== undefined ? { headless } : {}),
    },
  }
  // The endpoint embeds the access key, so it is never logged.
  const wsEndpoint = `${TESTMU_PLAYWRIGHT_ENDPOINT}?capabilities=${encodeURIComponent(
    JSON.stringify(capabilities)
  )}`

  const { chromium } = await import('playwright-core')
  signal?.throwIfAborted()
  const browser: Browser = await abortable(
    chromium.connect(wsEndpoint, { timeout: connectTimeoutMs }),
    signal
  )

  let closePromise: Promise<void> | undefined
  const closeBrowser = () => {
    closePromise ??= browser.close().catch((error) => {
      logger.error('Error closing TestMu browser', { error })
    })
    return closePromise
  }
  const onAbort = () => void closeBrowser()
  signal?.addEventListener('abort', onAbort, { once: true })

  let page: Page
  try {
    page = await abortable(browser.newPage(), signal)
  } catch (error) {
    signal?.removeEventListener('abort', onAbort)
    await closeBrowser()
    throw error
  }

  return {
    page,
    run: <T>(operation: Promise<T>) => abortable(operation, signal),
    close: async ({ passed, remark }) => {
      signal?.removeEventListener('abort', onAbort)
      if (!closePromise) {
        await setTestStatus(page, passed, remark).catch((error) => {
          logger.warn('Failed to report TestMu session status', { error })
        })
      }
      await closeBrowser()
    },
  }
}

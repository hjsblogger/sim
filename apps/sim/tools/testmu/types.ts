import type { UserFile } from '@/executor/types'
import type { OutputProperty, ToolResponse } from '@/tools/types'

interface TestMuBaseParams {
  username: string
  accessKey: string
  url: string
  waitForSelector?: string
  delayMs?: number
  timeoutMs?: number
  buildName?: string
}

export interface TestMuScrapeParams extends TestMuBaseParams {
  format?: 'text' | 'html'
}

export interface TestMuScreenshotParams extends TestMuBaseParams {
  fullPage?: boolean
  imageFormat?: 'png' | 'jpeg'
  quality?: number
}

export interface TestMuPdfParams extends TestMuBaseParams {
  paperFormat?: 'A4' | 'A3' | 'Letter' | 'Legal'
  landscape?: boolean
  printBackground?: boolean
}

export interface TestMuScrapeResponse extends ToolResponse {
  output: {
    url: string
    title: string
    content: string
    truncated: boolean
    statusCode: number | null
    metadata: Record<string, string>
    buildName: string
  }
}

export interface TestMuScreenshotResponse extends ToolResponse {
  output: {
    file: UserFile
    url: string
    title: string
    buildName: string
  }
}

export interface TestMuPdfResponse extends ToolResponse {
  output: {
    file: UserFile
    url: string
    title: string
    buildName: string
  }
}

/**
 * Params shared by every TestMu tool. The cloud browser runs on TestMu AI
 * (LambdaTest) infrastructure and authenticates with the account's username
 * and access key: https://www.lambdatest.com/support/docs/playwright-testing/
 */
export const TESTMU_SHARED_PARAMS = {
  username: {
    type: 'string',
    required: true,
    visibility: 'user-only',
    description: 'TestMu AI username',
  },
  accessKey: {
    type: 'string',
    required: true,
    visibility: 'user-only',
    description: 'TestMu AI access key',
  },
  url: {
    type: 'string',
    required: true,
    visibility: 'user-or-llm',
    description: 'URL of the webpage to open in the cloud browser',
  },
  waitForSelector: {
    type: 'string',
    required: false,
    visibility: 'user-or-llm',
    description: 'CSS selector to wait for before capturing the page',
  },
  delayMs: {
    type: 'number',
    required: false,
    visibility: 'user-only',
    description: 'Extra time to wait after the page loads, in milliseconds (max 30000)',
  },
  timeoutMs: {
    type: 'number',
    required: false,
    visibility: 'user-only',
    description: 'Navigation timeout in milliseconds (default 30000, max 120000)',
  },
  buildName: {
    type: 'string',
    required: false,
    visibility: 'user-only',
    description: 'Build name shown in the TestMu AI automation dashboard (default "Sim")',
  },
} as const

/** Outputs shared by every TestMu tool, produced by Sim's own operation. */
export const TESTMU_PAGE_OUTPUT_PROPERTIES = {
  url: { type: 'string', description: 'Final page URL after redirects' },
  title: { type: 'string', description: 'Page title' },
  buildName: {
    type: 'string',
    description: 'Build name the session was recorded under in the TestMu AI dashboard',
  },
} as const satisfies Record<string, OutputProperty>

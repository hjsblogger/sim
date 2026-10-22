import type { TestMuScrapeParams, TestMuScrapeResponse } from '@/tools/testmu/types'
import { TESTMU_PAGE_OUTPUT_PROPERTIES, TESTMU_SHARED_PARAMS } from '@/tools/testmu/types'
import type { InternalToolConfig } from '@/tools/types'

export const scrapeTool: InternalToolConfig<TestMuScrapeParams, TestMuScrapeResponse> = {
  id: 'testmu_scrape',
  name: 'TestMu Scrape',
  description: 'Open a webpage in a TestMu AI cloud browser and return its rendered content',
  version: '1.0.0',

  params: {
    ...TESTMU_SHARED_PARAMS,
    format: {
      type: 'string',
      required: false,
      visibility: 'user-or-llm',
      description: 'Content format: text (visible text, default) or html (full rendered HTML)',
    },
  },

  operation: {
    input: (params) => ({
      username: params.username,
      accessKey: params.accessKey,
      url: params.url,
      format: params.format,
      waitForSelector: params.waitForSelector,
      delayMs: params.delayMs,
      timeoutMs: params.timeoutMs,
      buildName: params.buildName,
    }),
  },

  transformResponse: async (response) => {
    const data = await response.json()
    return {
      success: true,
      output: {
        url: data.output.url,
        title: data.output.title ?? '',
        content: data.output.content ?? '',
        truncated: data.output.truncated ?? false,
        statusCode: data.output.statusCode ?? null,
        metadata: data.output.metadata ?? {},
        buildName: data.output.buildName,
      },
    }
  },

  outputs: {
    ...TESTMU_PAGE_OUTPUT_PROPERTIES,
    content: { type: 'string', description: 'Page content in the requested format' },
    truncated: {
      type: 'boolean',
      description: 'Whether the content was cut off at the 2,000,000 character limit',
    },
    statusCode: {
      type: 'number',
      description: 'HTTP status of the main document response',
      optional: true,
    },
    metadata: {
      type: 'json',
      description: 'Meta tags on the page, keyed by name or property (e.g. og:title)',
    },
  },
}

import type { TestMuPdfParams, TestMuPdfResponse } from '@/tools/testmu/types'
import { TESTMU_PAGE_OUTPUT_PROPERTIES, TESTMU_SHARED_PARAMS } from '@/tools/testmu/types'
import type { InternalToolConfig } from '@/tools/types'

export const pdfTool: InternalToolConfig<TestMuPdfParams, TestMuPdfResponse> = {
  id: 'testmu_pdf',
  name: 'TestMu PDF',
  description: 'Render a webpage to a PDF in a TestMu AI cloud browser',
  version: '1.0.0',

  params: {
    ...TESTMU_SHARED_PARAMS,
    paperFormat: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Paper size: A4 (default), A3, Letter, or Legal',
    },
    landscape: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Use landscape orientation (default false)',
    },
    printBackground: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Include background colors and images (default true)',
    },
  },

  operation: {
    input: (params) => ({
      username: params.username,
      accessKey: params.accessKey,
      url: params.url,
      paperFormat: params.paperFormat,
      landscape: params.landscape,
      printBackground: params.printBackground,
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
        file: data.output.file,
        url: data.output.url,
        title: data.output.title ?? '',
        buildName: data.output.buildName,
      },
    }
  },

  outputs: {
    file: { type: 'file', description: 'PDF document stored in execution files' },
    ...TESTMU_PAGE_OUTPUT_PROPERTIES,
  },
}

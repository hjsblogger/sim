import type { TestMuScreenshotParams, TestMuScreenshotResponse } from '@/tools/testmu/types'
import { TESTMU_PAGE_OUTPUT_PROPERTIES, TESTMU_SHARED_PARAMS } from '@/tools/testmu/types'
import type { InternalToolConfig } from '@/tools/types'

export const screenshotTool: InternalToolConfig<TestMuScreenshotParams, TestMuScreenshotResponse> =
  {
    id: 'testmu_screenshot',
    name: 'TestMu Screenshot',
    description: 'Capture a screenshot of a webpage in a TestMu AI cloud browser',
    version: '1.0.0',

    params: {
      ...TESTMU_SHARED_PARAMS,
      fullPage: {
        type: 'boolean',
        required: false,
        visibility: 'user-or-llm',
        description: 'Capture the full scrollable page instead of the viewport (default true)',
      },
      imageFormat: {
        type: 'string',
        required: false,
        visibility: 'user-only',
        description: 'Image format: png (default) or jpeg',
      },
      quality: {
        type: 'number',
        required: false,
        visibility: 'user-only',
        description: 'JPEG quality from 1 to 100 (jpeg only)',
      },
    },

    operation: {
      input: (params) => ({
        username: params.username,
        accessKey: params.accessKey,
        url: params.url,
        fullPage: params.fullPage,
        imageFormat: params.imageFormat,
        quality: params.quality,
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
      file: { type: 'file', description: 'Screenshot image stored in execution files' },
      ...TESTMU_PAGE_OUTPUT_PROPERTIES,
    },
  }

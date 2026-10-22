import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import type { z } from 'zod'
import { getValidationErrorMessage } from '@/lib/api/server'
import {
  executeTestMuPdf,
  executeTestMuScrape,
  executeTestMuScreenshot,
  type TestMuOperationContext,
} from '@/lib/internal/testmu/operations'
import {
  testmuPdfInputSchema,
  testmuScrapeInputSchema,
  testmuScreenshotInputSchema,
} from '@/lib/internal/testmu/schema'
import type {
  InternalToolOperationCall,
  InternalToolOperationHandler,
  InternalToolOperationResult,
} from '@/lib/internal/tool-operations/types'

const logger = createLogger('TestMuToolExecution')

async function executeParsed<S extends z.ZodType>(
  request: InternalToolOperationCall,
  schema: S,
  execute: (
    input: z.output<S>,
    context: TestMuOperationContext
  ) => Promise<InternalToolOperationResult>
): Promise<InternalToolOperationResult> {
  const parsed = schema.safeParse(request.input)
  if (!parsed.success) {
    return Response.json(
      { error: getValidationErrorMessage(parsed.error, 'Invalid request parameters') },
      { status: 400 }
    )
  }
  if (!request.context.userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return execute(parsed.data, { signal: request.signal })
}

export const executeTestMuTool: InternalToolOperationHandler<InternalToolOperationResult> = async (
  request
) => {
  request.signal?.throwIfAborted()
  try {
    switch (request.toolId) {
      case 'testmu_scrape':
        return await executeParsed(request, testmuScrapeInputSchema, executeTestMuScrape)
      case 'testmu_screenshot':
        return await executeParsed(request, testmuScreenshotInputSchema, executeTestMuScreenshot)
      case 'testmu_pdf':
        return await executeParsed(request, testmuPdfInputSchema, executeTestMuPdf)
      default:
        return Response.json(
          { error: `Unsupported TestMu tool: ${request.toolId}` },
          { status: 500 }
        )
    }
  } catch (error) {
    request.signal?.throwIfAborted()
    const message = getErrorMessage(error, 'Unknown error')
    logger.error('TestMu operation dispatch failed', {
      error: message,
      requestId: request.requestId,
      toolId: request.toolId,
    })
    return Response.json({ error: message }, { status: 500 })
  }
}

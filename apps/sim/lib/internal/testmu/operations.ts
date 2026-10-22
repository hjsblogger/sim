import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { validateUrlWithDNS } from '@/lib/core/security/input-validation.server'
import {
  createTestMuSession,
  formatTestMuError,
  type TestMuSession,
} from '@/lib/internal/testmu/client'
import type {
  TestMuPageInput,
  TestMuPdfInput,
  TestMuScrapeInput,
  TestMuScreenshotInput,
} from '@/lib/internal/testmu/schema'
import {
  createInternalToolFileResult,
  type InternalToolFileResult,
} from '@/lib/internal/tool-operations/file-result'

const logger = createLogger('TestMuOperations')
const MAX_CONTENT_CHARS = 2_000_000
const MAX_METADATA_ENTRIES = 200
const MAX_FILE_BYTES = 50 * 1024 * 1024

export interface TestMuOperationContext {
  signal?: AbortSignal
}

interface LoadedPage {
  session: TestMuSession
  statusCode: number | null
}

function normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://${url}`
}

async function resolveTarget(
  rawUrl: string,
  signal?: AbortSignal
): Promise<{ url: string; hostname: string } | Response> {
  const url = normalizeUrl(rawUrl)
  const validation = await validateUrlWithDNS(url, 'url', 'requestTarget')
  signal?.throwIfAborted()
  if (!validation.isValid) {
    return Response.json({ error: validation.error }, { status: 400 })
  }
  return { url, hostname: new URL(url).hostname }
}

function fileStem(hostname: string): string {
  return hostname.replace(/[^a-z0-9.-]/gi, '_') || 'page'
}

/**
 * Opens `url` in a fresh TestMu cloud browser, runs `work` against the loaded
 * page, and always releases the session, reporting the outcome to the TestMu
 * AI dashboard.
 */
async function runOnPage<R>(
  input: TestMuPageInput,
  target: { url: string; hostname: string },
  label: string,
  context: TestMuOperationContext,
  work: (loaded: LoadedPage) => Promise<R>,
  options: { headless?: boolean } = {}
): Promise<R | Response> {
  let session: TestMuSession | undefined
  let passed = false
  let remark = `${label} failed`
  try {
    session = await createTestMuSession({
      username: input.username,
      accessKey: input.accessKey,
      buildName: input.buildName,
      testName: `${label} ${target.hostname}`,
      headless: options.headless,
      connectTimeoutMs: input.timeoutMs,
      signal: context.signal,
    })
    const { page } = session
    const response = await session.run(
      page.goto(target.url, { waitUntil: 'load', timeout: input.timeoutMs })
    )
    if (input.waitForSelector) {
      await session.run(page.waitForSelector(input.waitForSelector, { timeout: input.timeoutMs }))
    }
    if (input.delayMs) {
      await session.run(page.waitForTimeout(input.delayMs))
    }
    const result = await work({ session, statusCode: response?.status() ?? null })
    passed = true
    remark = `${label} completed`
    return result
  } catch (error) {
    context.signal?.throwIfAborted()
    const message = formatTestMuError(getErrorMessage(error, 'Unknown error'), input.accessKey)
    remark = message
    logger.error(`TestMu ${label.toLowerCase()} failed`, { error: message })
    return Response.json({ error: message }, { status: 500 })
  } finally {
    await session?.close({ passed, remark })
  }
}

function assertFileSize(buffer: Buffer, kind: string): void {
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`${kind} is ${buffer.length} bytes, above the ${MAX_FILE_BYTES} byte limit`)
  }
}

export async function executeTestMuScrape(
  input: TestMuScrapeInput,
  context: TestMuOperationContext
): Promise<Response> {
  const target = await resolveTarget(input.url, context.signal)
  if (target instanceof Response) return target

  return runOnPage(input, target, 'Scrape', context, async ({ session, statusCode }) => {
    const { page } = session
    const title = await session.run(page.title())
    const content =
      input.format === 'html'
        ? await session.run(page.content())
        : await session.run(page.evaluate(() => document.body?.innerText ?? ''))
    const metadata = await session.run(
      page.evaluate((limit) => {
        const metas: Record<string, string> = {}
        for (const meta of Array.from(document.querySelectorAll('meta'))) {
          if (Object.keys(metas).length >= limit) break
          const name = meta.getAttribute('name') || meta.getAttribute('property')
          const value = meta.getAttribute('content')
          if (name && value) metas[name] = value
        }
        return metas
      }, MAX_METADATA_ENTRIES)
    )
    const truncated = content.length > MAX_CONTENT_CHARS

    return Response.json({
      success: true,
      output: {
        url: page.url(),
        title,
        content: truncated ? content.slice(0, MAX_CONTENT_CHARS) : content,
        truncated,
        statusCode,
        metadata,
        buildName: input.buildName,
      },
    })
  })
}

export async function executeTestMuScreenshot(
  input: TestMuScreenshotInput,
  context: TestMuOperationContext
): Promise<Response | InternalToolFileResult> {
  const target = await resolveTarget(input.url, context.signal)
  if (target instanceof Response) return target

  return runOnPage(input, target, 'Screenshot', context, async ({ session }) => {
    const { page } = session
    const isJpeg = input.imageFormat === 'jpeg'
    const buffer = await session.run(
      page.screenshot({
        fullPage: input.fullPage,
        type: input.imageFormat,
        ...(isJpeg && input.quality !== undefined ? { quality: input.quality } : {}),
        timeout: input.timeoutMs,
      })
    )
    assertFileSize(buffer, 'Screenshot')
    const title = await session.run(page.title())
    const url = page.url()

    return createInternalToolFileResult(
      {
        buffer,
        name: `${fileStem(target.hostname)}-screenshot.${isJpeg ? 'jpg' : 'png'}`,
        mimeType: isJpeg ? 'image/jpeg' : 'image/png',
      },
      (file) => ({ success: true, output: { file, url, title, buildName: input.buildName } })
    )
  })
}

export async function executeTestMuPdf(
  input: TestMuPdfInput,
  context: TestMuOperationContext
): Promise<Response | InternalToolFileResult> {
  const target = await resolveTarget(input.url, context.signal)
  if (target instanceof Response) return target

  return runOnPage(
    input,
    target,
    'PDF',
    context,
    async ({ session }) => {
      const { page } = session
      const buffer = await session.run(
        page.pdf({
          format: input.paperFormat,
          landscape: input.landscape,
          printBackground: input.printBackground,
        })
      )
      assertFileSize(buffer, 'PDF')
      const title = await session.run(page.title())
      const url = page.url()

      return createInternalToolFileResult(
        {
          buffer,
          name: `${fileStem(target.hostname)}.pdf`,
          mimeType: 'application/pdf',
        },
        (file) => ({ success: true, output: { file, url, title, buildName: input.buildName } })
      )
    },
    // Chromium renders PDFs only in headless mode.
    { headless: true }
  )
}

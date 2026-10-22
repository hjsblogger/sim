import { z } from 'zod'

const testmuPageInputShape = {
  username: z.string().trim().min(1, 'TestMu AI username is required'),
  accessKey: z.string().trim().min(1, 'TestMu AI access key is required'),
  url: z.string().trim().min(1, 'URL is required'),
  waitForSelector: z.string().trim().min(1).optional(),
  delayMs: z.number().int().min(0).max(30_000).optional(),
  timeoutMs: z.number().int().min(1_000).max(120_000).optional().default(30_000),
  buildName: z.string().trim().min(1).max(255).optional().default('Sim'),
}

export const testmuScrapeInputSchema = z.object({
  ...testmuPageInputShape,
  format: z.enum(['text', 'html']).optional().default('text'),
})

export const testmuScreenshotInputSchema = z.object({
  ...testmuPageInputShape,
  fullPage: z.boolean().optional().default(true),
  imageFormat: z.enum(['png', 'jpeg']).optional().default('png'),
  quality: z.number().int().min(1).max(100).optional(),
})

export const testmuPdfInputSchema = z.object({
  ...testmuPageInputShape,
  paperFormat: z.enum(['A4', 'A3', 'Letter', 'Legal']).optional().default('A4'),
  landscape: z.boolean().optional().default(false),
  printBackground: z.boolean().optional().default(true),
})

export type TestMuPageInput = z.output<z.ZodObject<typeof testmuPageInputShape>>
export type TestMuScrapeInput = z.output<typeof testmuScrapeInputSchema>
export type TestMuScreenshotInput = z.output<typeof testmuScreenshotInputSchema>
export type TestMuPdfInput = z.output<typeof testmuPdfInputSchema>

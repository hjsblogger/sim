import { TestMuIcon } from '@/components/icons'
import { AuthMode, type BlockConfig, type BlockMeta, IntegrationType } from '@/blocks/types'

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  const trimmed = typeof value === 'string' ? value.trim() : value
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

export const TestMuBlock: BlockConfig = {
  type: 'testmu',
  name: 'TestMu AI Browser Cloud',
  description: 'Scrape, screenshot, and print pages in a cloud browser',
  authMode: AuthMode.ApiKey,
  longDescription:
    'Open webpages in a real Chrome browser on TestMu AI Browser Cloud to read rendered content, capture screenshots, or save PDFs. Every run is recorded in the TestMu AI automation dashboard with video and console logs.',
  docsLink: 'https://docs.sim.ai/integrations/testmu',
  category: 'tools',
  integrationType: IntegrationType.Search,
  bgColor: '#0B0B0F',
  icon: TestMuIcon,
  canvasPresentation: {
    defaultTitle: 'TestMu AI',
    sentences: {
      byOperation: {
        scrape: [
          { text: 'Scrape', field: 'url', core: true },
          { text: 'as', field: 'format' },
        ],
        screenshot: [{ text: 'Screenshot', field: 'url', core: true }],
        pdf: [{ text: 'Save', field: 'url', after: 'as a PDF', core: true }],
      },
    },
  },
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      options: [
        { label: 'Scrape Page', id: 'scrape' },
        { label: 'Take Screenshot', id: 'screenshot' },
        { label: 'Save as PDF', id: 'pdf' },
      ],
      value: () => 'scrape',
    },
    {
      id: 'url',
      title: 'URL',
      type: 'short-input',
      placeholder: 'https://example.com',
      required: true,
    },
    // Scrape fields
    {
      id: 'format',
      title: 'Format',
      type: 'dropdown',
      options: [
        { label: 'Text', id: 'text' },
        { label: 'HTML', id: 'html' },
      ],
      value: () => 'text',
      condition: { field: 'operation', value: 'scrape' },
    },
    // Screenshot fields
    {
      id: 'fullPage',
      title: 'Full Page',
      type: 'switch',
      defaultValue: true,
      condition: { field: 'operation', value: 'screenshot' },
    },
    {
      id: 'imageFormat',
      title: 'Image Format',
      type: 'dropdown',
      options: [
        { label: 'PNG', id: 'png' },
        { label: 'JPEG', id: 'jpeg' },
      ],
      value: () => 'png',
      condition: { field: 'operation', value: 'screenshot' },
      mode: 'advanced',
    },
    {
      id: 'quality',
      title: 'JPEG Quality',
      type: 'short-input',
      placeholder: '1 to 100',
      condition: { field: 'operation', value: 'screenshot' },
      mode: 'advanced',
    },
    // PDF fields
    {
      id: 'paperFormat',
      title: 'Paper Size',
      type: 'dropdown',
      options: [
        { label: 'A4', id: 'A4' },
        { label: 'A3', id: 'A3' },
        { label: 'Letter', id: 'Letter' },
        { label: 'Legal', id: 'Legal' },
      ],
      value: () => 'A4',
      condition: { field: 'operation', value: 'pdf' },
    },
    {
      id: 'landscape',
      title: 'Landscape',
      type: 'switch',
      condition: { field: 'operation', value: 'pdf' },
      mode: 'advanced',
    },
    {
      id: 'printBackground',
      title: 'Print Background',
      type: 'switch',
      defaultValue: true,
      condition: { field: 'operation', value: 'pdf' },
      mode: 'advanced',
    },
    // Shared page-load fields
    {
      id: 'waitForSelector',
      title: 'Wait For Selector',
      type: 'short-input',
      placeholder: '#content',
      mode: 'advanced',
    },
    {
      id: 'delayMs',
      title: 'Delay (ms)',
      type: 'short-input',
      placeholder: '0 to 30000',
      mode: 'advanced',
    },
    {
      id: 'timeoutMs',
      title: 'Timeout (ms)',
      type: 'short-input',
      placeholder: 'Defaults to 30000',
      mode: 'advanced',
    },
    {
      id: 'buildName',
      title: 'Build Name',
      type: 'short-input',
      placeholder: 'Defaults to Sim',
      mode: 'advanced',
    },
    // Credentials
    {
      id: 'username',
      title: 'Username',
      type: 'short-input',
      placeholder: 'Enter your TestMu AI username',
      required: true,
    },
    {
      id: 'accessKey',
      title: 'Access Key',
      type: 'short-input',
      password: true,
      placeholder: 'Enter your TestMu AI access key',
      required: true,
    },
  ],
  tools: {
    access: ['testmu_scrape', 'testmu_screenshot', 'testmu_pdf'],
    config: {
      tool: (params) => `testmu_${params.operation || 'scrape'}`,
      params: (params) => {
        const base = {
          username: params.username,
          accessKey: params.accessKey,
          url: params.url,
          waitForSelector: params.waitForSelector || undefined,
          delayMs: toOptionalNumber(params.delayMs),
          timeoutMs: toOptionalNumber(params.timeoutMs),
          buildName: params.buildName || undefined,
        }

        if (params.operation === 'screenshot') {
          return {
            ...base,
            fullPage: params.fullPage,
            imageFormat: params.imageFormat,
            quality: toOptionalNumber(params.quality),
          }
        }
        if (params.operation === 'pdf') {
          return {
            ...base,
            paperFormat: params.paperFormat,
            landscape: params.landscape,
            printBackground: params.printBackground,
          }
        }
        return { ...base, format: params.format }
      },
    },
  },
  inputs: {
    operation: { type: 'string', description: 'Operation: scrape, screenshot, or pdf' },
    url: { type: 'string', description: 'URL of the webpage to open' },
    username: { type: 'string', description: 'TestMu AI username' },
    accessKey: { type: 'string', description: 'TestMu AI access key' },
    format: { type: 'string', description: 'Scrape format: text or html (scrape operation)' },
    fullPage: { type: 'boolean', description: 'Capture the full page (screenshot operation)' },
    imageFormat: { type: 'string', description: 'png or jpeg (screenshot operation)' },
    quality: { type: 'number', description: 'JPEG quality 1-100 (screenshot operation)' },
    paperFormat: { type: 'string', description: 'A4, A3, Letter, or Legal (pdf operation)' },
    landscape: { type: 'boolean', description: 'Landscape orientation (pdf operation)' },
    printBackground: { type: 'boolean', description: 'Print backgrounds (pdf operation)' },
    waitForSelector: { type: 'string', description: 'CSS selector to wait for after load' },
    delayMs: { type: 'number', description: 'Extra wait after load in milliseconds' },
    timeoutMs: { type: 'number', description: 'Navigation timeout in milliseconds' },
    buildName: { type: 'string', description: 'Build name in the TestMu AI dashboard' },
  },
  outputs: {
    url: { type: 'string', description: 'Final page URL after redirects' },
    title: { type: 'string', description: 'Page title' },
    buildName: { type: 'string', description: 'Build name in the TestMu AI dashboard' },
    // Scrape outputs
    content: { type: 'string', description: 'Page content (scrape operation)' },
    truncated: {
      type: 'boolean',
      description: 'Whether the content hit the size limit (scrape operation)',
    },
    statusCode: {
      type: 'number',
      description: 'HTTP status of the main document (scrape operation)',
    },
    metadata: { type: 'json', description: 'Page meta tags (scrape operation)' },
    // Screenshot and PDF outputs
    file: { type: 'file', description: 'Screenshot image or PDF (screenshot and pdf operations)' },
  },
}

export const TestMuBlockMeta = {
  tags: ['web-scraping', 'automation', 'cloud'],
  url: 'https://www.testmuai.com',
  templates: [
    {
      icon: TestMuIcon,
      title: 'TestMu competitor pricing monitor',
      prompt:
        'Create a scheduled workflow that uses TestMu AI Browser Cloud to scrape competitor pricing pages every Monday, compares the plans and prices against last week in a table, and posts any changes to Slack.',
      modules: ['scheduled', 'tables', 'agent', 'workflows'],
      category: 'operations',
      tags: ['research', 'monitoring'],
      alsoIntegrations: ['slack'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu landing page screenshot archive',
      prompt:
        'Build a scheduled workflow that uses TestMu AI Browser Cloud to take full-page screenshots of our marketing landing pages each week and saves them to files so the team can review how the site changed over time.',
      modules: ['scheduled', 'files', 'workflows'],
      category: 'marketing',
      tags: ['marketing', 'monitoring'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu policy page PDF archiver',
      prompt:
        'Create a scheduled workflow that uses TestMu AI Browser Cloud to save our terms of service, privacy policy, and vendor policy pages as PDFs every month and stores them in files as a compliance record.',
      modules: ['scheduled', 'files', 'workflows'],
      category: 'operations',
      tags: ['enterprise', 'automation'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu SEO meta tag auditor',
      prompt:
        'Build a workflow that reads a list of URLs from a table, uses TestMu AI Browser Cloud to scrape each page, checks the title and Open Graph meta tags, and writes missing or duplicate tags back to the table.',
      modules: ['tables', 'agent', 'workflows'],
      category: 'marketing',
      tags: ['marketing', 'seo'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu vendor changelog digest',
      prompt:
        'Create a scheduled workflow that uses TestMu AI Browser Cloud to scrape the changelog pages of the tools we depend on, has an agent summarize what changed this week, and emails the digest to the engineering team.',
      modules: ['scheduled', 'agent', 'workflows'],
      category: 'engineering',
      tags: ['engineering', 'research'],
      alsoIntegrations: ['gmail'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu careers page watcher',
      prompt:
        'Build a scheduled workflow that uses TestMu AI Browser Cloud to scrape the careers pages of target accounts, detects newly posted roles that signal buying intent, and adds them to a sales prospecting table.',
      modules: ['scheduled', 'tables', 'agent', 'workflows'],
      category: 'sales',
      tags: ['sales', 'research'],
    },
    {
      icon: TestMuIcon,
      title: 'TestMu release smoke check',
      prompt:
        'Create a workflow that runs after each deploy, uses TestMu AI Browser Cloud to open the key public pages of our app, checks the HTTP status and page title, captures a screenshot of each, and posts failures to Slack.',
      modules: ['files', 'agent', 'workflows'],
      category: 'engineering',
      tags: ['engineering', 'monitoring'],
      alsoIntegrations: ['slack'],
    },
  ],
  skills: [
    {
      name: 'scrape-rendered-page',
      description:
        'Read the content of a JavaScript-heavy page after it renders in a real browser. Use when a plain HTTP fetch returns an empty shell or misses content loaded by scripts.',
      content:
        '# Scrape Rendered Page\n\nRead a webpage the way a visitor sees it.\n\n## Steps\n1. Choose the Scrape Page operation and enter the URL.\n2. Pick Text for readable content or HTML when you need the full rendered markup.\n3. If content loads late, set Wait For Selector to an element that only appears once the data is in, or add a short Delay.\n4. Check Status Code and Truncated before trusting the content.\n\n## Output\nReturn the page title, final URL, and content. If the status code is an error or the selector never appeared, report that instead of summarizing an incomplete page.',
    },
    {
      name: 'capture-page-screenshot',
      description:
        'Capture a screenshot of a webpage in a cloud browser. Use for visual monitoring, design reviews, or keeping a record of how a page looked at a point in time.',
      content:
        '# Capture Page Screenshot\n\nTake a picture of a webpage.\n\n## Steps\n1. Choose the Take Screenshot operation and enter the URL.\n2. Leave Full Page on to capture the whole scrollable page, or turn it off for just the visible viewport.\n3. Use JPEG with a lower quality when file size matters, PNG when detail matters.\n4. Set Wait For Selector if the page shows a loader before its content.\n\n## Output\nReturn the screenshot file with the page title and final URL. Note when the URL redirected somewhere unexpected.',
    },
    {
      name: 'save-page-as-pdf',
      description:
        'Render a webpage to a PDF document. Use to archive policies, receipts, or reports from a site as a file that can be stored or shared.',
      content:
        '# Save Page As PDF\n\nTurn a webpage into a PDF.\n\n## Steps\n1. Choose the Save as PDF operation and enter the URL.\n2. Pick the Paper Size your readers expect (A4 or Letter).\n3. Turn on Landscape for wide tables, and keep Print Background on to preserve colors and images.\n\n## Output\nReturn the PDF file with the page title and final URL so the archived copy can be traced back to its source.',
    },
  ],
} as const satisfies BlockMeta

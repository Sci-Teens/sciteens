import { describe, expect, it } from 'vitest'

import {
  compactMarkdown,
  extractPageMarkdown,
  sectionScore,
} from './pageContent.js'

describe('extractPageMarkdown', () => {
  it('uses Readability to retain program content and remove page chrome', () => {
    const markdown = extractPageMarkdown(
      `
        <html>
          <body>
            <nav>Site navigation</nav>
            <main>
              <h1>Summer Research Program</h1>
              <p>Students conduct supervised research.</p>
              <h2>Key dates</h2>
              <ul><li>Applications close March 1, 2027.</li></ul>
              <table><tr><th>Program</th><td>June 10 to July 20, 2027</td></tr></table>
            </main>
            <footer>Copyright</footer>
          </body>
        </html>
      `,
      'https://example.org/program'
    )

    expect(markdown).toContain('# Summer Research Program')
    expect(markdown).toContain('## Key dates')
    expect(markdown).toContain(
      'Applications close March 1, 2027.'
    )
    expect(markdown).toContain('June 10 to July 20, 2027')
    expect(markdown).not.toContain('Site navigation')
    expect(markdown).not.toContain('Copyright')
  })
})

describe('sectionScore', () => {
  it('prioritizes program dates and eligibility over overview text', () => {
    expect(
      sectionScore('## Key dates\n\nSummer 2027 session')
    ).toBeGreaterThan(
      sectionScore('# Program overview\n\nWelcome.')
    )
    expect(
      sectionScore(
        '## Eligibility\n\nResidential students only'
      )
    ).toBeGreaterThan(
      sectionScore('# Program overview\n\nWelcome.')
    )
  })
})

describe('compactMarkdown', () => {
  it('keeps complete high-value sections after the content budget', () => {
    const overviewBlocks = Array.from(
      { length: 6 },
      (_, index) =>
        `Overview block ${index}: ${'Background context. '.repeat(
          70
        )}`
    )
    const markdown = [
      '# Program overview',
      ...overviewBlocks,
      '## Key dates',
      'The program runs June 10 to July 20, 2027.',
      '## Eligibility',
      'Applicants must be in grades 9 through 12.',
    ].join('\n\n')

    const compact = compactMarkdown(markdown)

    expect(compact.length).toBeLessThanOrEqual(8000)
    expect(compact).toContain('## Key dates')
    expect(compact).toContain(
      'The program runs June 10 to July 20, 2027.'
    )
    expect(compact).toContain('## Eligibility')
    expect(compact).toContain(
      'Applicants must be in grades 9 through 12.'
    )
    expect(compact).toContain('Overview block 0:')
    expect(compact).not.toContain('Overview block 5:')
  })
})

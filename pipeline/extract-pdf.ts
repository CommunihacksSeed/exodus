/**
 * Extracts page-by-page text from the City's PDF reports so that quotes in
 * our explanations can be checked verbatim and linked to the right page.
 *
 * Usage: tsx pipeline/extract-pdf.ts            (all PDFs in data/documents)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const DIR = path.resolve(import.meta.dirname, '../data/documents')

export async function extractPages(file: string): Promise<string[]> {
  const data = new Uint8Array(await readFile(file))
  const pdf = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    const text = content.items
      .map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : ''))
      .join(' ')
    pages.push(text.replace(/[ \t]+/g, ' ').trim())
  }
  return pages
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const name of (await readdir(DIR)).filter((f) => f.endsWith('.pdf'))) {
    const pages = await extractPages(path.join(DIR, name))
    const out = path.join(DIR, name.replace(/\.pdf$/, '.pages.json'))
    await writeFile(out, JSON.stringify({ file: name, pages }, null, 1))
    const chars = pages.reduce((n, p) => n + p.length, 0)
    console.log(`${name}: ${pages.length} pages, ${chars} chars`)
  }
}

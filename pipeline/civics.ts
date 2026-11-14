/**
 * Checks the explainer content (src/content/civics.ts): every quote must appear word for word
 * in the saved copy of its source, the same rule as for item explanations.
 * Used by `npm run data` (refuses to publish) and by the tests.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as cheerio from 'cheerio'
import { CIVIC_SOURCES, GLOSSARY, PROCESS } from '../src/content/civics.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const norm = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function sourceText(file: string): string {
  const raw = readFileSync(path.join(ROOT, file), 'utf8')
  if (file.endsWith('.pages.json')) return norm((JSON.parse(raw) as { pages: string[] }).pages.join(' '))
  if (file.endsWith('.html')) return norm(cheerio.load(raw).text())
  return norm(raw)
}

/** Every quote in the explainer content, with where it is used. */
export function civicQuotes() {
  return [
    ...PROCESS.flatMap((stop) => stop.facts.map((f) => ({ where: `process.${stop.id}`, quote: f.quote, source: f.source }))),
    ...GLOSSARY.map((t) => ({ where: `glossary.${t.id}`, quote: t.inContext.quote, source: t.inContext.source })),
  ]
}

/** Returns one message per quote that cannot be found; empty when everything checks out. */
export function checkCivics(): string[] {
  const texts = new Map(CIVIC_SOURCES.map((s) => [s.id, sourceText(s.file)]))
  const problems: string[] = []
  for (const q of civicQuotes()) {
    const text = texts.get(q.source)
    if (text === undefined) problems.push(`${q.where}: unknown source "${q.source}"`)
    else if (!text.includes(norm(q.quote))) problems.push(`${q.where}: quote not found in ${q.source}: "${q.quote}"`)
  }
  const ids = GLOSSARY.map((t) => t.id)
  for (const id of ids) if (ids.indexOf(id) !== ids.lastIndexOf(id)) problems.push(`glossary: duplicate id ${id}`)
  return problems
}

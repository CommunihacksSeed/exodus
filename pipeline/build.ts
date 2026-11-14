/**
 * Build step: snapshots + explanations -> src/generated/items.json
 *
 *  1. Parse every saved City item page into a structured record (no AI).
 *  2. For every plain-language claim, check that each quoted passage appears
 *     word-for-word in the cited source, and attach a deep link to it.
 *  3. Refuse to publish (exit 1) if any quote cannot be found.
 *
 * Usage: npm run data
 */
import { findUnsafeLinks } from '../src/lib/safe.ts'
import { checkCivics } from './civics.ts'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import * as cheerio from 'cheerio'
import { parseTmmisItem } from './parse-tmmis.ts'
import type {
  Citation,
  Claim,
  Explanation,
  ItemRecord,
  PublishedItem,
  SourceDoc,
  VerifiedCitation,
} from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const SNAPSHOTS = path.join(ROOT, 'data/snapshots')
const EXPLANATIONS = path.join(ROOT, 'data/explanations')
const DOCUMENTS = path.join(ROOT, 'data/documents')
const OUT = path.join(ROOT, 'src/generated')

/** Whitespace-insensitive comparison only. Wording must match exactly. */
const norm = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/** Chrome/Edge/Safari "scroll to text" link: #:~:text=first words,last words */
function textFragment(quote: string): string {
  const words = norm(quote).split(' ')
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D')
  if (words.length <= 8) return `#:~:text=${enc(words.join(' '))}`
  return `#:~:text=${enc(words.slice(0, 4).join(' '))},${enc(words.slice(-4).join(' '))}`
}

interface LoadedSource {
  doc: SourceDoc
  /** One entry per page; the item page counts as a single page. */
  pages: string[]
  isPdf: boolean
}

async function loadSources(record: ItemRecord, itemText: string, docs: SourceDoc[]) {
  const sources = new Map<string, LoadedSource>()
  sources.set('item', {
    doc: {
      id: 'item',
      label: `City of Toronto item page ${record.id}`,
      url: record.sourceUrl,
      // Toronto's calendar date, not UTC's, so it matches the date shown elsewhere on the page.
      date: `captured ${new Date(record.retrievedAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`,
    },
    pages: [itemText],
    isPdf: false,
  })
  for (const doc of docs) {
    if (!doc.textFile) throw new Error(`Source "${doc.id}" has no textFile`)
    const { pages } = JSON.parse(await readFile(path.join(DOCUMENTS, doc.textFile), 'utf8'))
    sources.set(doc.id, { doc, pages: (pages as string[]).map(norm), isPdf: true })
  }
  return sources
}

function verify(c: Citation, sources: Map<string, LoadedSource>): VerifiedCitation {
  const src = sources.get(c.source)
  if (!src) throw new Error(`Unknown source "${c.source}"`)
  const quote = norm(c.quote)
  const pageIndex = src.pages.findIndex((p) => p.includes(quote))
  const verified = pageIndex >= 0
  return {
    ...c,
    verified,
    sourceLabel: src.doc.label,
    sourceDate: src.doc.date,
    page: src.isPdf && verified ? pageIndex + 1 : null,
    url: src.isPdf
      ? `${src.doc.url}${verified ? `#page=${pageIndex + 1}` : ''}`
      : `${src.doc.url}${textFragment(quote)}`,
  }
}

const failures: string[] = []

function verifyClaims(itemId: string, claims: Claim[], sources: Map<string, LoadedSource>) {
  return claims.map((claim): Claim<VerifiedCitation> => {
    if (claim.citations.length === 0) failures.push(`${itemId}: claim has no source: "${claim.text}"`)
    const citations = claim.citations.map((c) => verify(c, sources))
    for (const c of citations) {
      if (!c.verified) failures.push(`${itemId}: quote not found in "${c.source}": "${c.quote}"`)
    }
    return { ...claim, citations }
  })
}

const items: PublishedItem[] = []

for (const file of (await readdir(SNAPSHOTS)).filter((f) => f.endsWith('.html')).sort()) {
  const html = await readFile(path.join(SNAPSHOTS, file), 'utf8')
  const record = parseTmmisItem(html)
  const itemText = norm(cheerio.load(html)('main').text())

  const explPath = path.join(EXPLANATIONS, `${record.id}.json`)
  let explanation: Explanation<VerifiedCitation> | null = null
  if (existsSync(explPath)) {
    const raw: Explanation = JSON.parse(await readFile(explPath, 'utf8'))
    const sources = await loadSources(record, itemText, raw.sources)
    const v = (claims: Claim[]) => verifyClaims(record.id, claims, sources)
    explanation = {
      ...raw,
      whatIsProposed: v(raw.whatIsProposed),
      why: v(raw.why),
      whoIsAffected: v(raw.whoIsAffected),
      conditionsAndUnknowns: v(raw.conditionsAndUnknowns),
      whatHappensNext: v(raw.whatHappensNext),
      stageSummaries: Object.fromEntries(
        Object.entries(raw.stageSummaries).map(([k, claim]) => [k, v([claim])[0]]),
      ),
    }
    // The 3D map draws a block this many storeys high, so the number must come from a checked quote.
    const proposedQuotes = explanation.whatIsProposed.flatMap((c) => c.citations.map((q) => norm(q.quote)))
    for (const storeys of raw.location.proposedStoreys ?? []) {
      if (!proposedQuotes.some((q) => new RegExp(`(^|\\D)${storeys}-storey`).test(q))) {
        failures.push(`${record.id}: proposedStoreys ${storeys} is not in any quote under whatIsProposed`)
      }
    }
  }
  items.push({ record, explanation })
  console.log(`${record.id}: parsed${explanation ? ', explanation checked' : ' (no explanation yet)'}`)
}

if (failures.length) {
  console.error(`\n${failures.length} source check(s) failed — nothing was published:`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

await mkdir(OUT, { recursive: true })

// Ward outlines for the map, thinned so the browser download stays small.
const wardsFile = path.join(ROOT, 'data/geo/city-wards.geojson')
const wardsGeo = JSON.parse(await readFile(wardsFile, 'utf8'))
const round = (n: number) => Math.round(n * 1e5) / 1e5
const wards = wardsGeo.features.map((f: any) => ({
  number: Number(f.properties.AREA_SHORT_CODE),
  name: f.properties.AREA_NAME,
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
  polygons: f.geometry.coordinates.map((poly: number[][][]) =>
    poly[0].filter((_, i, ring) => i % 4 === 0 || i === ring.length - 1).map(([lng, lat]) => [round(lat), round(lng)]),
  ),
}))
const civic = checkCivics()
if (civic.length > 0) {
  console.error('\nRefusing to publish: quotes on the explainer pages not found in their sources:')
  for (const c of civic) console.error('  ' + c)
  process.exit(1)
}

const unsafe = findUnsafeLinks(items)
if (unsafe.length > 0) {
  console.error('\nRefusing to publish: these links are not https links to a City of Toronto site:')
  for (const u of unsafe.slice(0, 20)) console.error('  ' + u)
  process.exit(1)
}

await writeFile(path.join(OUT, 'wards.json'), JSON.stringify(wards))
await writeFile(path.join(OUT, 'items.json'), JSON.stringify(items, null, 1))
console.log(`\nWrote ${items.length} items to src/generated/items.json — every quote was found in its source.`)

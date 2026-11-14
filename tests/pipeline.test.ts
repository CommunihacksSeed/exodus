/**
 * Regression tests for the rule-based parts of Clear Council.
 * Run with: npm test
 *
 * The parser tests run against the real saved City pages in data/snapshots,
 * so they double as a record of what we expect each test item to say.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseDates, parseTmmisItem, parseWards } from '../pipeline/parse-tmmis.ts'
import { buildStages, itemStatus } from '../src/lib/stages.ts'
import { distanceMetres, formatDistance, nearestDistance } from '../src/lib/geo.ts'

const snapshot = (id: string) =>
  parseTmmisItem(readFileSync(path.resolve(import.meta.dirname, `../data/snapshots/tmmis-${id}.html`), 'utf8'))

test('parseDates handles single and two-day meetings', () => {
  assert.deepEqual(parseDates('November 16, 2026'), ['2026-11-16'])
  assert.deepEqual(parseDates('July 29 and 30, 2026'), ['2026-07-29', '2026-07-30'])
  assert.deepEqual(parseDates('sometime soon'), [])
})

test('parseWards splits ward names that themselves contain " - "', () => {
  assert.deepEqual(parseWards('4 - Parkdale - High Park, 9 - Davenport'), [
    { number: 4, name: 'Parkdale - High Park' },
    { number: 9, name: 'Davenport' },
  ])
})

test('upcoming item: staff advice only, participation offered, Council not in the record', () => {
  const r = snapshot('2027.PB1.6')
  assert.equal(itemStatus(r), 'open')
  assert.ok(r.participation.commentsUrl?.endsWith('/2027.PB1.6/comments'))
  const stages = buildStages(r)
  assert.deepEqual(stages.map((s) => s.state), ['advice', 'scheduled', 'not-in-record'])
  assert.equal(stages[0].dateText, 'October 28, 2026')
})

test('decided item: committee and Council outcomes are kept apart', () => {
  const r = snapshot('2026.NY34.12')
  assert.equal(itemStatus(r), 'decided')
  assert.equal(r.participation.commentsUrl, null)
  const [staff, committee, council] = buildStages(r)
  assert.equal(staff.kind, 'staff')
  assert.equal(committee.badge, 'Passed on with no recommendation')
  assert.equal(council.badge, 'Approved with changes')
  // The committee's motion to adopt lost 2-4; Council's amendment carried 25-1.
  const lost = committee.consideration!.motions.find((m) => m.result === 'Lost')!
  assert.deepEqual([lost.votes[0].yes.length, lost.votes[0].no.length], [2, 4])
  const carried = council.consideration!.motions[0].votes[0]
  assert.deepEqual([carried.yes.length, carried.no.length], [25, 1])
  assert.deepEqual(r.bylaws.map((b) => b.label), ['By-law 1249-2026', 'By-law 1250-2026'])
})

test('residents’ names are never stored, and correspondence is not double-counted', () => {
  const r = snapshot('2026.NY34.12')
  const [committee, council] = r.considerations
  assert.deepEqual([committee.communicationsCount, committee.speakersCount], [7, 4])
  assert.equal(council.communicationsCount, 1)
  // A correspondent named on the City page must not appear anywhere in our record.
  assert.ok(!JSON.stringify(r).includes('Palfreyman'))
})

test('distance: haversine, and nearest point on a route line', () => {
  const cityHall: [number, number] = [43.6534, -79.3841]
  const site: [number, number] = [43.640832976, -79.433921412]
  const d = distanceMetres(cityHall, site)
  assert.ok(d > 4100 && d < 4400, `expected about 4.2 km, got ${d}`)
  // A point 0.001° of latitude (about 111 m) off the middle of a segment.
  const line: [number, number][] = [[43.65, -79.4], [43.65, -79.38]]
  const near = nearestDistance([43.651, -79.39], line)
  assert.ok(near > 105 && near < 117, `expected about 111 m, got ${near}`)
  assert.equal(formatDistance(4321), 'about 4.3 km')
  assert.equal(formatDistance(260), 'about 250 m')
})

import { findUnsafeLinks, isSafeLink, isTorontoPoint, safeHref } from '../src/lib/safe.ts'
import { isPlaceMatch } from '../src/lib/geo.ts'
import { readFileSync as readJson } from 'node:fs'

test('links must be https to a City of Toronto host', () => {
  assert.equal(isSafeLink('https://secure.toronto.ca/council/agenda-item.do?item=2027.PB1.6'), true)
  assert.equal(isSafeLink('https://www.toronto.ca/legdocs/x.pdf#page=3'), true)
  for (const bad of [
    'javascript:alert(1)',
    'data:text/html,hi',
    'http://www.toronto.ca/',
    'https://toronto.ca.evil.com/',
    'https://evil.com/?https://toronto.ca',
    'https://user:pw@www.toronto.ca/',
    'not a url',
    '',
    null,
  ]) {
    assert.equal(isSafeLink(bad), false, String(bad))
  }
  assert.equal(safeHref('javascript:alert(1)'), '#')
})

test('every link in the published data is safe', () => {
  const items = JSON.parse(readJson(path.resolve(import.meta.dirname, '../src/generated/items.json'), 'utf8'))
  assert.deepEqual(findUnsafeLinks(items), [])
  assert.deepEqual(findUnsafeLinks({ a: [{ sourceUrl: 'javascript:1' }] }), ['$.a[0].sourceUrl'])
})

test('coordinates outside Toronto and malformed saved places are rejected', () => {
  assert.equal(isTorontoPoint(43.65, -79.38), true)
  assert.equal(isTorontoPoint(0, 0), false)
  assert.equal(isTorontoPoint(NaN, -79.38), false)
  assert.equal(isTorontoPoint('43.65', -79.38), false)
  assert.equal(isPlaceMatch({ label: '100 Queen St W', point: [43.65, -79.38], wardNumber: 10, wardName: 'Spadina' }), true)
  assert.equal(isPlaceMatch({ label: 1, point: [43.65, -79.38], wardNumber: null, wardName: null }), false)
  assert.equal(isPlaceMatch({ label: 'x', point: [99, 99], wardNumber: null, wardName: null }), false)
  assert.equal(isPlaceMatch('<script>'), false)
})

import { meetingsToIcs, upcomingMeetings } from '../src/lib/calendar.ts'
import { speechSegments } from '../src/lib/speech.ts'
import itemsData from '../src/generated/items.json' with { type: 'json' }
import type { PublishedItem } from '../src/types.ts'

const published = itemsData as unknown as PublishedItem[]
const byId = (id: string) => published.find((i) => i.record.id === id)!

test('calendar offers only scheduled, undecided, upcoming meeting dates', () => {
  // 2027.PB1.6: the Preservation Board is scheduled for November 16, 2026 and has not decided.
  const pb = byId('2027.PB1.6').record
  assert.deepEqual(upcomingMeetings(pb, '2026-11-14').map((m) => m.date), ['2026-11-16'])
  // Once the date has passed, nothing is offered (the record may be stale; we do not guess).
  assert.deepEqual(upcomingMeetings(pb, '2026-11-17'), [])
  // A decided item never offers a meeting.
  assert.deepEqual(upcomingMeetings(byId('2026.NY34.12').record, '2000-01-01'), [])
})

test('calendar file is valid, escaped, and says it is not a deadline', () => {
  const pb = byId('2027.PB1.6').record
  const ics = meetingsToIcs(pb, 'A title; with, commas', upcomingMeetings(pb, '2026-11-14'), new Date('2026-11-14T12:00:00Z'))
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
  assert.match(ics, /DTSTART;VALUE=DATE:20261116\r\n/)
  assert.match(ics, /DTEND;VALUE=DATE:20261117\r\n/)
  assert.ok(ics.includes('A title\\; with\\, commas'), 'semicolons and commas escaped')
  assert.match(ics.replace(/\r\n /g, ''), /not a deadline to comment/)
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75), 'lines folded at 75')
  assert.ok(!/deadline:/i.test(ics))
})

test('read-aloud uses only text already on the page, in page order', () => {
  const item = byId('2027.PB1.6')
  const segs = speechSegments(item)
  const ex = item.explanation!
  assert.equal(segs[0].text, ex.plainTitle)
  for (const c of ex.whatIsProposed) assert.ok(segs.some((s) => s.text === c.text && s.sectionId === 'what-h'))
  const order = segs.map((s) => s.sectionId).filter((v, i, a) => a.indexOf(v) === i)
  assert.deepEqual(order, ['top', 'say-h', 'what-h', 'why-h', 'where-h', 'cond-h', ...(ex.whatHappensNext.length ? ['next-h'] : []), 'trust-h'])
})

import { rankVoices, voiceLabel } from '../src/lib/voices.ts'

test('read-aloud never offers novelty voices and prefers natural, on-device ones', () => {
  const v = (name: string, lang = 'en-US', localService = true) => ({ name, lang, voiceURI: name, localService })
  const ranked = rankVoices([
    v('Zarvox'), v('Bad News'), v('Bubbles'), v('Fred'), v('Grandpa (English (US))'),
    v('Albert'), v('Samantha'), v('Daniel', 'en-GB'), v('Ava (Premium)'), v('Thomas', 'fr-FR'),
    v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false),
  ]).map((x) => x.name)
  assert.equal(ranked[0], 'Ava (Premium)')
  assert.ok(ranked.indexOf('Samantha') < ranked.indexOf('Microsoft Aria Online (Natural) - English (United States)'), 'on-device before online')
  for (const bad of ['Zarvox', 'Bad News', 'Bubbles', 'Fred', 'Grandpa (English (US))', 'Albert', 'Thomas']) {
    assert.ok(!ranked.includes(bad), bad)
  }
  assert.equal(voiceLabel(v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false)), 'Aria (US, online)')
  assert.equal(voiceLabel(v('Samantha')), 'Samantha (US)')
})

import { checkCivics, civicQuotes } from '../pipeline/civics.ts'

test('every quote on the explainer pages is found word for word in its saved source', () => {
  assert.ok(civicQuotes().length >= 25)
  assert.deepEqual(checkCivics(), [])
})

import { readdirSync, statSync } from 'node:fs'
import { fr } from '../src/i18n/fr.ts'
import { zh } from '../src/i18n/zh.ts'
import { GLOSSARY, PROCESS } from '../src/content/civics.ts'
import { CAN_ACT, STATUS_LABEL, STATUS_WORDS } from '../src/lib/stages.ts'
import { THEMES } from '../src/lib/mapTheme.ts'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(f) ? [p] : []
  })
}

test('every interface string has a French and a Chinese translation with the same placeholders', () => {
  const src = path.resolve(import.meta.dirname, '../src')
  const keys = new Set<string>()
  // Literal calls: t('...') and t("...")
  for (const file of sourceFiles(src)) {
    if (file.includes(`${path.sep}i18n${path.sep}`)) continue
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'"))
  }
  // Data passed to t() at run time
  const data = [
    ...Object.values(STATUS_LABEL), ...Object.values(CAN_ACT), ...Object.values(STATUS_WORDS), ...THEMES.map((x) => x.label),
    ...PROCESS.flatMap((s) => [s.title, s.who, s.youCan]), ...GLOSSARY.map((g) => g.meaning), ...new Set(GLOSSARY.map((g) => g.group)),
    'City staff advice', 'City Council — final decision', 'Committee or board review',
    'Advice only — not a decision', 'Scheduled — not decided yet', 'No date in the City record yet', 'Considered',
    'Map', 'My ward', 'How decisions are made', 'Words', 'How we check',
    'New building', 'Transit', 'Heritage and housing', 'Staff', 'Committee', 'Council', 'Slower', 'Normal', 'Faster',
    'Have a say', 'What', 'Why', 'Near me?', 'Conditions', 'Who decided', 'Sources',
  ]
  for (const d of data) keys.add(d)
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  const missing: string[] = []
  for (const k of keys) {
    for (const [name, dict] of [['fr', fr], ['zh', zh]] as const) {
      if (!(k in dict)) missing.push(`${name}: ${k}`)
      else if (placeholders(dict[k]) !== placeholders(k)) missing.push(`${name} placeholders differ: ${k}`)
    }
  }
  assert.deepEqual(missing, [])
  assert.ok(keys.size > 200, `found ${keys.size} strings`)
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(zh).sort(), 'French and Chinese cover the same strings')
})

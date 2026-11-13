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

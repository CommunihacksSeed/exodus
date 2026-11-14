/** Small geography helpers. All distance maths runs in the browser. */

export type LatLng = [number, number]

/** Great-circle distance in metres (haversine formula). */
export function distanceMetres(a: LatLng, b: LatLng): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Shortest distance from a point to an item's location: a single point, or a
 * line through several points (e.g. a streetcar route). For a line we measure
 * to the nearest spot on each segment, not just to its corner points.
 */
export function nearestDistance(from: LatLng, points: LatLng[]): number {
  if (points.length === 1) return distanceMetres(from, points[0])
  // Flat-earth projection around `from`; accurate to well under 1% at city scale.
  const mPerLat = 111320
  const mPerLng = 111320 * Math.cos((from[0] * Math.PI) / 180)
  const xy = points.map(([lat, lng]) => [(lng - from[1]) * mPerLng, (lat - from[0]) * mPerLat])
  let best = Infinity
  for (let i = 0; i < xy.length - 1; i++) {
    const [ax, ay] = xy[i]
    const [bx, by] = xy[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}

/** "about 350 m" / "about 2.4 km" — rounded so it does not look more exact than it is. */
export function formatDistance(m: number): string {
  if (m < 1000) return `about ${Math.max(50, Math.round(m / 50) * 50)} m`
  return `about ${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`
}

/** Rough walking time at 4.5 km/h, for distances where walking is realistic. */
export function walkMinutes(m: number): number | null {
  return m <= 2500 ? Math.max(1, Math.round(m / 75)) : null
}

import { isTorontoPoint } from './safe.ts'

export interface PlaceMatch {
  label: string
  point: LatLng
  wardNumber: number | null
  wardName: string | null
}

const GEOCODER = 'https://map.toronto.ca/cotgeocoder/rest/geocoder'
const TIMEOUT_MS = 8000
const MAX_QUERY = 120

/** Thrown for any lookup failure, with a message that is safe and useful to show a resident. */
export class AddressLookupError extends Error {}

async function getJson(url: string): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch {
    throw new AddressLookupError('The City address service did not answer in time. Please try again.')
  }
  if (!res.ok) throw new AddressLookupError('The City address service is unavailable right now.')
  try {
    return await res.json()
  } catch {
    throw new AddressLookupError('The City address service sent something we could not read.')
  }
}

const text = (v: unknown, max = 200): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

/**
 * Address lookup against the City of Toronto's own public geocoder.
 * The typed address goes to map.toronto.ca and nowhere else: no cookies, no referrer.
 * Every field of the reply is checked, because it is not our data.
 */
export async function findAddress(query: string): Promise<PlaceMatch[]> {
  const q = query.trim().slice(0, MAX_QUERY)
  if (q.length < 3) return []
  const suggest = (await getJson(
    `${GEOCODER}/suggest?f=json&addressOnly=1&retRowLimit=5&searchString=${encodeURIComponent(q)}`,
  )) as { result?: { rows?: { KEYSTRING?: unknown }[] } }
  const keys = (suggest?.result?.rows ?? [])
    .map((r) => text(r?.KEYSTRING, 300))
    .filter((k): k is string => k !== null)
    .slice(0, 5)
  const matches = await Promise.all(
    keys.map(async (key) => {
      const res = (await getJson(
        `${GEOCODER}/findAddressCandidates?f=json&retRowLimit=1&keyString=${encodeURIComponent(key)}`,
      )) as { result?: { rows?: Record<string, unknown>[] } }
      const hit = res?.result?.rows?.[0]
      if (!hit) return null
      const lat = hit.OUTY ?? hit.LATITUDE
      const lng = hit.OUTX ?? hit.LONGITUDE
      const label = text(hit.ADDRESS_FULL) ?? text(hit.KEY_DESC)
      if (!label || !isTorontoPoint(lat, lng)) return null
      const ward = Number(hit.WARD_NUMBER)
      const match: PlaceMatch = {
        label,
        point: [lat, lng as number],
        wardNumber: Number.isInteger(ward) && ward > 0 && ward <= 50 ? ward : null,
        wardName: text(hit.WARD, 80),
      }
      return match
    }),
  )
  return matches.filter((m): m is PlaceMatch => m !== null)
}

/** Shape check for a PlaceMatch read back from sessionStorage. */
export function isPlaceMatch(v: unknown): v is PlaceMatch {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  const p = m.point
  return (
    typeof m.label === 'string' &&
    m.label.length <= 200 &&
    Array.isArray(p) &&
    p.length === 2 &&
    isTorontoPoint(p[0], p[1]) &&
    (m.wardNumber === null || Number.isInteger(m.wardNumber)) &&
    (m.wardName === null || typeof m.wardName === 'string')
  )
}

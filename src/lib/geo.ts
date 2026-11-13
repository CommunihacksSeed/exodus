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

export interface PlaceMatch {
  label: string
  point: LatLng
  wardNumber: number | null
  wardName: string | null
}

const GEOCODER = 'https://map.toronto.ca/cotgeocoder/rest/geocoder'

/**
 * Address lookup against the City of Toronto's own public geocoder.
 * The typed address goes to map.toronto.ca and nowhere else.
 */
export async function findAddress(query: string): Promise<PlaceMatch[]> {
  const suggest = await fetch(
    `${GEOCODER}/suggest?f=json&addressOnly=1&retRowLimit=5&searchString=${encodeURIComponent(query)}`,
  ).then((r) => r.json())
  const rows: { KEYSTRING: string }[] = suggest?.result?.rows ?? []
  const matches = await Promise.all(
    rows.map(async (row) => {
      const res = await fetch(
        `${GEOCODER}/findAddressCandidates?f=json&retRowLimit=1&keyString=${encodeURIComponent(row.KEYSTRING)}`,
      ).then((r) => r.json())
      const hit = res?.result?.rows?.[0]
      if (!hit || typeof hit.LATITUDE !== 'number' && typeof hit.OUTY !== 'number') return null
      const match: PlaceMatch = {
        label: hit.ADDRESS_FULL ?? hit.KEY_DESC,
        point: [hit.OUTY ?? hit.LATITUDE, hit.OUTX ?? hit.LONGITUDE],
        wardNumber: hit.WARD_NUMBER ? Number(hit.WARD_NUMBER) : null,
        wardName: hit.WARD ?? null,
      }
      return match
    }),
  )
  return matches.filter((m): m is PlaceMatch => m !== null)
}

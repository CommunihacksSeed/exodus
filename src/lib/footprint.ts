/**
 * Centre of a building footprint as [lng, lat], or null for anything unusable.
 * Map tiles can hold empty or clipped geometries (an empty MultiPolygon, a ring with no points),
 * so nothing here assumes a shape.
 */
export function footprintCentre(geometry: { type?: unknown; coordinates?: unknown } | null | undefined): [number, number] | null {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null
  const c = geometry.coordinates as unknown[]
  const ring = geometry.type === 'Polygon' ? c[0] : geometry.type === 'MultiPolygon' && Array.isArray(c[0]) ? (c[0] as unknown[])[0] : null
  if (!Array.isArray(ring) || ring.length === 0) return null
  let x = 0
  let y = 0
  let n = 0
  for (const p of ring) {
    if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue
    x += p[0]
    y += p[1]
    n++
  }
  return n ? [x / n, y / n] : null
}

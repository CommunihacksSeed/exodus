/**
 * Small trust-boundary helpers shared by the build pipeline, the browser app and the tests.
 * Anything that comes from outside our own code (City pages, the geocoder, sessionStorage)
 * is checked here before it is shown or linked.
 */

/** Hosts the site is allowed to link to. Everything is the City's own public record. */
export const LINK_HOSTS = [
  'toronto.ca',
  'secure.toronto.ca',
  'www.toronto.ca',
  'open.toronto.ca',
  'map.toronto.ca',
  'documents.toronto.ca',
]

/** True only for https links to an allowed host (or one of its subdomains). */
export function isSafeLink(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length > 4000) return false
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' || u.username || u.password) return false
  return LINK_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))
}

/** Returns the link if safe, otherwise '#' so a bad value can never become a javascript: URL. */
export function safeHref(raw: unknown): string {
  return isSafeLink(raw) ? raw : '#'
}

/** Walks any JSON value and returns the path of every link-like field that is not safe. */
export function findUnsafeLinks(value: unknown, trail = '$'): string[] {
  const bad: string[] = []
  if (Array.isArray(value)) {
    value.forEach((v, i) => bad.push(...findUnsafeLinks(v, `${trail}[${i}]`)))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/url$/i.test(k) && v != null && !isSafeLink(v)) bad.push(`${trail}.${k}`)
      else bad.push(...findUnsafeLinks(v, `${trail}.${k}`))
    }
  }
  return bad
}

/** Rough bounding box around the City of Toronto, to reject nonsense coordinates. */
export function isTorontoPoint(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat > 43.5 &&
    lat < 43.95 &&
    lng > -79.7 &&
    lng < -79.0
  )
}

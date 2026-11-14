/**
 * Shared setup for the 3D maps: a tilted vector map with buildings drawn at
 * their real heights. MapLibre GL JS renders it; the map data is OpenStreetMap,
 * served as vector tiles by OpenFreeMap (no API key, no account).
 */
import * as maplibregl from 'maplibre-gl'
import type { LngLatLike, Map as GlMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre does its heavy work in a web worker. Let the bundler build that file and tell MapLibre where it is.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { wards } from './data.ts'
import { applyTheme, savedTheme } from './mapTheme.ts'
import type { LatLng } from './geo.ts'

maplibregl.setWorkerUrl(workerUrl)

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/** Toronto's street grid sits about 17° off north. Turning the map to match makes streets read straight. */
export const GRID_BEARING = -17
export const TILT = 58

export const lngLat = ([lat, lng]: LatLng): LngLatLike => [lng, lat]

export function boundsOf(points: LatLng[]) {
  const b = new maplibregl.LngLatBounds()
  for (const p of points) b.extend(lngLat(p))
  return b
}

/** Labels for the map library's own buttons and hints, in the interface language. */
export function mapLocale(t: Translate): Record<string, string> {
  return {
    'Map.Title': t('Map'),
    'Marker.Title': t('Map marker'),
    'NavigationControl.ZoomIn': t('Zoom in'),
    'NavigationControl.ZoomOut': t('Zoom out'),
    'NavigationControl.ResetBearing': t('Drag to rotate map, click to reset north'),
    'FullscreenControl.Enter': t('Enter fullscreen'),
    'FullscreenControl.Exit': t('Exit fullscreen'),
    'AttributionControl.ToggleAttribution': t('Toggle attribution'),
    'AttributionControl.MapFeedback': t('Map feedback'),
    'CooperativeGesturesHandler.WindowsHelpText': t('Use Ctrl + scroll to zoom the map'),
    'CooperativeGesturesHandler.MacHelpText': t('Use ⌘ + scroll to zoom the map'),
    'CooperativeGesturesHandler.MobileHelpText': t('Use two fingers to move the map'),
  }
}

/** Returns null when the device cannot draw a 3D map (no WebGL); callers then show text only. */
export function create3dMap(container: HTMLElement, options: { cooperative?: boolean; locale?: Record<string, string> } = {}): GlMap | null {
  try {
    const map = new maplibregl.Map({
      container,
      style: STYLE,
      center: [-79.3832, 43.6532],
      zoom: 10.5,
      pitch: TILT,
      bearing: GRID_BEARING,
      maxPitch: 75,
      // On an item page the map sits in the middle of a long page: one finger scrolls the page, two move the map.
      cooperativeGestures: options.cooperative ?? false,
      // The map library's own control labels, in the interface language.
      locale: options.locale,
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left')
    const fullscreen = new maplibregl.FullscreenControl()
    map.addControl(fullscreen, 'top-left')
    // Full screen is the map's own space: let one finger and the scroll wheel move and zoom it freely.
    if (options.cooperative) {
      fullscreen.on('fullscreenstart', () => map.cooperativeGestures.disable())
      fullscreen.on('fullscreenend', () => map.cooperativeGestures.enable())
    }
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')
    map.on('style.load', () => {
      if (map.getLayer('building-3d')) map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.92)
      applyTheme(map, savedTheme())
    })
    enableFlightKeys(map)
    startAmbient(map)
    return map
  } catch {
    return null
  }
}

/** Ward outlines. Pass ward numbers to draw only those, more boldly. */
export function addWards(map: GlMap, only?: number[]) {
  const shown = only ? wards.filter((w) => only.includes(w.number)) : wards
  map.addSource('cc-wards', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: shown.map((w) => ({
        type: 'Feature',
        properties: { name: `Ward ${w.number}: ${w.name}` },
        geometry: { type: 'MultiLineString', coordinates: w.polygons.map((ring) => ring.map(([lat, lng]) => [lng, lat])) },
      })),
    },
  })
  map.addLayer({
    id: 'cc-wards',
    type: 'line',
    source: 'cc-wards',
    paint: { 'line-color': '#1747c9', 'line-width': only ? 2.5 : 1.2, 'line-opacity': only ? 0.8 : 0.5, 'line-dasharray': only ? [3, 2] : [1] },
  })
}

/** A route (a line through several points) drawn on the ground, with a soft glow under it. Returns the clickable layer id. */
export function addRoute(map: GlMap, name: string, points: LatLng[], colour: string): string {
  const id = `cc-${name}`
  map.addSource(id, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) } },
  })
  map.addLayer({
    id: `${id}-glow`,
    type: 'line',
    source: id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colour, 'line-width': 18, 'line-opacity': 0.25, 'line-blur': 8 },
  })
  map.addLayer({
    id,
    type: 'line',
    source: id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colour, 'line-width': 7, 'line-opacity': 0.95 },
  })
  return id
}

import { METRES_PER_STOREY } from './storey.ts'
import type { Translate } from '../i18n/index.tsx'
export { METRES_PER_STOREY }

/**
 * Blocks showing how tall the proposed buildings would be beside their neighbours.
 * Only the height comes from the City record. The footprint is a plain square,
 * because the record we read does not give the building's outline.
 */
export function addProposedHeights(map: GlMap, name: string, [lat, lng]: LatLng, storeys: number[]) {
  const id = `cc-${name}`
  const SIDE = 26
  const GAP = 44
  const SLAB = METRES_PER_STOREY * 0.78 // a thin gap between floors makes each storey countable
  const rad = (d: number) => (d * Math.PI) / 180
  // Unit vectors along and across the street grid, as [east, north].
  const along = [Math.sin(rad(90 + GRID_BEARING)), Math.cos(rad(90 + GRID_BEARING))]
  const across = [Math.sin(rad(GRID_BEARING)), Math.cos(rad(GRID_BEARING))]
  const toLngLat = (a: number, c: number) => {
    const east = a * along[0] + c * across[0]
    const north = a * along[1] + c * across[1]
    return [lng + east / (111320 * Math.cos(rad(lat))), lat + north / 111320]
  }
  const square = (centre: number, half: number) =>
    [[-half, -half], [half, -half], [half, half], [-half, half], [-half, -half]].map(([a, c]) => toLngLat(centre + a, c))
  const floors = storeys.flatMap((n, i) => {
    const centre = (i - (storeys.length - 1) / 2) * GAP
    const ring = square(centre, SIDE / 2)
    return Array.from({ length: n }, (_, f) => ({
      type: 'Feature' as const,
      properties: { min_height: f * METRES_PER_STOREY, height: f * METRES_PER_STOREY + SLAB, share: n > 1 ? f / (n - 1) : 1 },
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    }))
  })
  // A faint full-height shell around the floors, so the whole volume reads as one building.
  const shells = storeys.map((n, i) => ({
    type: 'Feature' as const,
    properties: { height: n * METRES_PER_STOREY },
    geometry: { type: 'Polygon' as const, coordinates: [square((i - (storeys.length - 1) / 2) * GAP, SIDE / 2 + 1.5)] },
  }))
  map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: floors } })
  map.addSource(`${id}-shell`, { type: 'geojson', data: { type: 'FeatureCollection', features: shells } })
  // Floors first, then the see-through shell: a shell drawn first would hide the floors inside it (depth test).
  map.addLayer({
    id,
    type: 'fill-extrusion',
    source: id,
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'share'], 0, '#ffb000', 1, '#fff27a'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-opacity': 0.88,
      'fill-extrusion-vertical-gradient': true,
    },
  })
  map.addLayer({
    id: `${id}-shell`,
    type: 'fill-extrusion',
    source: `${id}-shell`,
    paint: { 'fill-extrusion-color': '#ffe680', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.18 },
  })
  ambientLayers.get(map)?.add(id)
}

/**
 * Light columns rising from each decision, like quest markers in a game, plus a glowing ring on the ground.
 * The column is a very thin, tall, see-through extrusion so it never hides the buildings around it.
 */
export function addBeacons(map: GlMap, sites: { point: LatLng; colour: string }[]) {
  const rad = (d: number) => (d * Math.PI) / 180
  const column = ([lat, lng]: LatLng, r: number) =>
    Array.from({ length: 13 }, (_, k) => {
      const a = (k / 12) * 2 * Math.PI
      return [lng + (r * Math.cos(a)) / (111320 * Math.cos(rad(lat))), lat + (r * Math.sin(a)) / 111320]
    })
  map.addSource('cc-beacons', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: sites.map((s) => ({
        type: 'Feature' as const,
        properties: { colour: s.colour },
        geometry: { type: 'Polygon' as const, coordinates: [column(s.point, 9)] },
      })),
    },
  })
  map.addSource('cc-beacon-points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: sites.map((s) => ({
        type: 'Feature' as const,
        properties: { colour: s.colour },
        geometry: { type: 'Point' as const, coordinates: [s.point[1], s.point[0]] },
      })),
    },
  })
  map.addLayer({
    id: 'cc-beacon-ring',
    type: 'circle',
    source: 'cc-beacon-points',
    paint: {
      'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 6, 17, 60],
      'circle-color': ['get', 'colour'],
      'circle-opacity': 0.25,
      'circle-blur': 0.8,
      'circle-pitch-alignment': 'map',
    },
  })
  map.addLayer({
    id: 'cc-beacons',
    type: 'fill-extrusion',
    source: 'cc-beacons',
    minzoom: 11,
    paint: {
      'fill-extrusion-color': ['get', 'colour'],
      'fill-extrusion-height': 420,
      'fill-extrusion-opacity': 0.4,
      'fill-extrusion-vertical-gradient': true,
    },
  })
}

/**
 * A camera direction from which the site is not hidden behind a tall existing building.
 * Looks at the four directions along the street grid and scores each by the existing buildings
 * standing between the camera and the site, weighted by how tall they are. Real buildings are
 * never hidden or removed from the map; only the viewpoint changes.
 */
export function clearViewBearing(map: GlMap, [lat, lng]: LatLng, heightM: number): number {
  const candidates = [GRID_BEARING, GRID_BEARING + 180, GRID_BEARING + 90, GRID_BEARING - 90]
  let features: { geometry: { type: string; coordinates: unknown }; properties: Record<string, unknown> }[] = []
  try {
    features = map.querySourceFeatures('openmaptiles', { sourceLayer: 'building' }) as typeof features
  } catch {
    return GRID_BEARING
  }
  const mPerLng = 111320 * Math.cos((lat * Math.PI) / 180)
  const blockers = features
    .map((f) => {
      const c = f.geometry.coordinates
      const ring: number[][] | null =
        f.geometry.type === 'Polygon' ? (c as number[][][])[0] : f.geometry.type === 'MultiPolygon' ? (c as number[][][][])[0][0] : null
      if (!ring?.length) return null
      const cx = ring.reduce((a, p) => a + p[0], 0) / ring.length
      const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length
      const east = (cx - lng) * mPerLng
      const north = (cy - lat) * 111320
      const dist = Math.hypot(east, north)
      const h = Number(f.properties.render_height ?? 0)
      if (dist < 18 || dist > 260 || h < Math.max(12, heightM * 0.35)) return null
      return { dist, h, dir: (Math.atan2(east, north) * 180) / Math.PI }
    })
    .filter((b): b is { dist: number; h: number; dir: number } => b !== null)
  const angleBetween = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
  let best = GRID_BEARING
  let bestScore = Infinity
  for (const bearing of candidates) {
    const towardCamera = bearing + 180 // the camera sits behind the view direction
    const score = blockers.reduce((sum, b) => (angleBetween(b.dir, towardCamera) < 28 ? sum + b.h / Math.sqrt(b.dist) : sum), 0)
    if (score < bestScore - 0.01) {
      bestScore = score
      best = bearing
    }
  }
  return best
}

/**
 * Calls back once the tiles in view have loaded (or after a few seconds regardless).
 * MapLibre's "idle" event is not used because the ambient glow keeps the map repainting.
 */
export function whenTilesLoaded(map: GlMap, done: () => void, timeoutMs = 8000) {
  const started = performance.now()
  const check = () => {
    if (!map.getCanvas().isConnected) return
    if (map.areTilesLoaded() || performance.now() - started > timeoutMs) done()
    else setTimeout(check, 250)
  }
  setTimeout(check, 250)
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Layers that breathe gently (proposed buildings). */
const ambientLayers = new WeakMap<GlMap, Set<string>>()

/** A slow pulse on the proposed buildings and the beacon rings. Off when the system asks for reduced motion. */
function startAmbient(map: GlMap) {
  ambientLayers.set(map, new Set())
  if (reducedMotion()) return
  let frame = 0
  let last = 0
  const tick = (t: number) => {
    frame = requestAnimationFrame(tick)
    if (t - last < 66) return // about 15 updates a second is plenty for a slow glow
    last = t
    const wave = (Math.sin(t / 700) + 1) / 2
    for (const id of ambientLayers.get(map) ?? []) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'fill-extrusion-opacity', 0.72 + wave * 0.24)
    }
    if (map.getLayer('cc-beacon-ring')) {
      map.setPaintProperty('cc-beacon-ring', 'circle-opacity', 0.12 + wave * 0.28)
    }
  }
  frame = requestAnimationFrame(tick)
  map.on('remove', () => cancelAnimationFrame(frame))
}

/**
 * Game-style flying with the keyboard while the map has focus:
 * W/S forward and back, A/D sideways, Q/E turn, R/F tilt, Shift to go faster.
 * (MapLibre's own arrow keys and +/- zoom keep working.)
 */
function enableFlightKeys(map: GlMap) {
  const canvas = map.getCanvas()
  const held = new Set<string>()
  let frame = 0
  let fast = false
  const step = () => {
    frame = 0
    if (held.size === 0) return
    const speed = fast ? 26 : 11
    let x = 0
    let y = 0
    if (held.has('w')) y -= speed
    if (held.has('s')) y += speed
    if (held.has('a')) x -= speed
    if (held.has('d')) x += speed
    if (x || y) map.panBy([x, y], { duration: 0 })
    if (held.has('q')) map.setBearing(map.getBearing() - (fast ? 2.4 : 1.2))
    if (held.has('e')) map.setBearing(map.getBearing() + (fast ? 2.4 : 1.2))
    if (held.has('r')) map.setPitch(Math.min(map.getMaxPitch(), map.getPitch() + 0.8))
    if (held.has('f')) map.setPitch(Math.max(0, map.getPitch() - 0.8))
    frame = requestAnimationFrame(step)
  }
  canvas.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key.toLowerCase()
    if (!'wasdqerf'.includes(k) || k.length !== 1) return
    e.preventDefault()
    fast = e.shiftKey
    held.add(k)
    if (!frame) frame = requestAnimationFrame(step)
  })
  canvas.addEventListener('keyup', (e) => {
    held.delete(e.key.toLowerCase())
    fast = e.shiftKey
  })
  canvas.addEventListener('blur', () => held.clear())
  map.on('remove', () => cancelAnimationFrame(frame))
}

/** A marker drawn like a stop on the route strip, with its name above it. */
export function pinElement(kind: string, name: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `pin pin-${kind}`
  const dot = document.createElement('span')
  dot.className = 'pin-dot'
  const label = document.createElement('span')
  label.className = 'pin-name'
  label.lang = 'en'
  label.textContent = name
  el.append(dot, label)
  return el
}

export { maplibregl }

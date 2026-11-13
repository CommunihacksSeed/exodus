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

/** Returns null when the device cannot draw a 3D map (no WebGL); callers then show text only. */
export function create3dMap(container: HTMLElement, options: { cooperative?: boolean } = {}): GlMap | null {
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
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left')
    map.on('style.load', () => {
      // Stronger, cooler buildings so their height reads clearly against the ground.
      if (map.getLayer('building-3d')) {
        map.setPaintProperty('building-3d', 'fill-extrusion-color', [
          'interpolate', ['linear'], ['get', 'render_height'], 0, '#dfe5ea', 40, '#b9c8d6', 200, '#8ea6c0',
        ])
        map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.92)
      }
      // Sky above the horizon only. Ground fog is off: at city scale it would white out the whole map.
      map.setSky({ 'sky-color': '#9cc3ee', 'horizon-color': '#e8f0f7', 'fog-color': '#e8f0f7', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.3, 'fog-ground-blend': 1 })
    })
    return map
  } catch {
    return null
  }
}

/** Ward outlines. Pass ward numbers to draw only those, more boldly. */
export function addWards(map: GlMap, only?: number[]) {
  const shown = only ? wards.filter((w) => only.includes(w.number)) : wards
  map.addSource('wards', {
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
    id: 'wards',
    type: 'line',
    source: 'wards',
    paint: { 'line-color': '#1747c9', 'line-width': only ? 2.5 : 1.2, 'line-opacity': only ? 0.8 : 0.5, 'line-dasharray': only ? [3, 2] : [1] },
  })
}

/** A route (a line through several points) drawn on the ground. */
export function addRoute(map: GlMap, id: string, points: LatLng[], colour: string) {
  map.addSource(id, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) } },
  })
  map.addLayer({
    id,
    type: 'line',
    source: id,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colour, 'line-width': 7, 'line-opacity': 0.9 },
  })
}

/** Assumed floor-to-floor height. Real buildings vary; the block is a guide to scale, not a drawing. */
export const METRES_PER_STOREY = 3

/**
 * Blocks showing how tall the proposed buildings would be beside their neighbours.
 * Only the height comes from the City record. The footprint is a plain square,
 * because the record we read does not give the building's outline.
 */
export function addProposedHeights(map: GlMap, id: string, [lat, lng]: LatLng, storeys: number[]) {
  const SIDE = 26
  const GAP = 44
  const rad = (d: number) => (d * Math.PI) / 180
  // Unit vectors along and across the street grid, as [east, north].
  const along = [Math.sin(rad(90 + GRID_BEARING)), Math.cos(rad(90 + GRID_BEARING))]
  const across = [Math.sin(rad(GRID_BEARING)), Math.cos(rad(GRID_BEARING))]
  const toLngLat = (a: number, c: number) => {
    const east = a * along[0] + c * across[0]
    const north = a * along[1] + c * across[1]
    return [lng + east / (111320 * Math.cos(rad(lat))), lat + north / 111320]
  }
  const features = storeys.map((n, i) => {
    const centre = (i - (storeys.length - 1) / 2) * GAP
    const h = SIDE / 2
    const ring = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]].map(([a, c]) => toLngLat(centre + a, c))
    return {
      type: 'Feature' as const,
      properties: { height: n * METRES_PER_STOREY },
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
    }
  })
  map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features } })
  map.addLayer({
    id,
    type: 'fill-extrusion',
    source: id,
    paint: { 'fill-extrusion-color': '#ffd21f', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.82 },
  })
}

/** A marker drawn like a stop on the route strip, with its name above it. */
export function pinElement(kind: string, name: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = `pin pin-${kind}`
  const dot = document.createElement('span')
  dot.className = 'pin-dot'
  const label = document.createElement('span')
  label.className = 'pin-name'
  label.textContent = name
  el.append(dot, label)
  return el
}

export { maplibregl }

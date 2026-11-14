/**
 * Time-of-day looks for the 3D map: day (the base style), dusk and night.
 * The base map is restyled layer by layer from a small palette, and the light,
 * sky and building colours follow. Purely visual: no data changes.
 */
import type { Map as GlMap } from 'maplibre-gl'

export type MapTheme = 'day' | 'dusk' | 'night'
export const THEMES: { id: MapTheme; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'night', label: 'Night' },
]

const KEY = 'exodus:map-theme'

export function savedTheme(): MapTheme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'dusk' || t === 'night' ? t : 'day'
  } catch {
    return 'day'
  }
}

export function saveTheme(t: MapTheme) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* not remembered: fine */
  }
}

interface Palette {
  background: string
  land: string
  park: string
  water: string
  building: string
  roadMajor: string
  roadMinor: string
  casing: string
  rail: string
  label: string
  halo: string
  /** Building colour by height in metres: [low, mid, tall]. */
  towers: [string, string, string]
  light: { color: string; intensity: number; azimuth: number; polar: number }
  sky: { sky: string; horizon: string; fog: string }
}

const PALETTES: Record<Exclude<MapTheme, 'day'>, Palette> = {
  dusk: {
    background: '#3d3653',
    land: '#463e5f',
    park: '#43584f',
    water: '#2b3d6e',
    building: '#5b4f73',
    roadMajor: '#ffb070',
    roadMinor: '#8f80ad',
    casing: '#2a2339',
    rail: '#6d6188',
    label: '#fff1e2',
    halo: '#2a2339',
    towers: ['#6e5f8c', '#b9809a', '#ffb084'],
    light: { color: '#ffb47a', intensity: 0.55, azimuth: 255, polar: 72 },
    sky: { sky: '#5d4f8f', horizon: '#ff9f72', fog: '#c98a8a' },
  },
  night: {
    background: '#0b1020',
    land: '#111832',
    park: '#10251f',
    water: '#06132e',
    building: '#161e3a',
    roadMajor: '#ffc45c',
    roadMinor: '#3b4a78',
    casing: '#070b17',
    rail: '#2c3760',
    label: '#dfe8ff',
    halo: '#070b17',
    towers: ['#151d3a', '#253766', '#4867b8'],
    light: { color: '#a9bcff', intensity: 0.3, azimuth: 200, polar: 40 },
    sky: { sky: '#030614', horizon: '#1d2a5c', fog: '#141d3d' },
  },
}

const DAY_LIGHT = { color: '#ffffff', intensity: 0.45, azimuth: 210, polar: 35 }
const DAY_SKY = { sky: '#9cc3ee', horizon: '#e8f0f7', fog: '#e8f0f7' }
const DAY_TOWERS: [string, string, string] = ['#dfe5ea', '#b9c8d6', '#8ea6c0']

/** Remembers each paint value before the first change, so "day" can put the base style back exactly. */
type PaintProp = Parameters<GlMap['setPaintProperty']>[1]
type PaintValue = Parameters<GlMap['setPaintProperty']>[2]

const originals = new WeakMap<GlMap, Map<string, unknown>>()

function setPaint(map: GlMap, layer: string, prop: string, value: unknown) {
  let store = originals.get(map)
  if (!store) originals.set(map, (store = new Map()))
  const key = `${layer}\u0000${prop}`
  if (!store.has(key)) store.set(key, map.getPaintProperty(layer, prop as PaintProp))
  try {
    map.setPaintProperty(layer, prop as PaintProp, value as PaintValue)
  } catch {
    /* a property this layer does not support: skip */
  }
}

function restore(map: GlMap) {
  const store = originals.get(map)
  if (!store) return
  for (const [key, value] of store) {
    const [layer, prop] = key.split('\u0000')
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop as PaintProp, value as PaintValue)
  }
}

function towerColour([low, mid, tall]: [string, string, string]) {
  return ['interpolate', ['linear'], ['get', 'render_height'], 0, low, 40, mid, 200, tall]
}

function applyLightAndSky(map: GlMap, light: Palette['light'], sky: Palette['sky']) {
  map.setLight({ anchor: 'map', color: light.color, intensity: light.intensity, position: [1.5, light.azimuth, light.polar] })
  map.setSky({
    'sky-color': sky.sky,
    'horizon-color': sky.horizon,
    'fog-color': sky.fog,
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.3,
    'fog-ground-blend': 1,
  })
}

/** Restyles the loaded map for a time of day. Our own layers (ids starting "cc-") are left alone. */
export function applyTheme(map: GlMap, theme: MapTheme) {
  if (!map.isStyleLoaded() && !map.getStyle()) return
  if (theme === 'day') {
    restore(map)
    if (map.getLayer('building-3d')) setPaint(map, 'building-3d', 'fill-extrusion-color', towerColour(DAY_TOWERS))
    applyLightAndSky(map, DAY_LIGHT, DAY_SKY)
    map.getContainer().dataset.theme = theme
    return
  }
  const p = PALETTES[theme]
  for (const layer of map.getStyle().layers) {
    const id = layer.id
    if (id.startsWith('cc-')) continue
    switch (layer.type) {
      case 'background':
        setPaint(map, id, 'background-color', p.background)
        break
      case 'raster':
        setPaint(map, id, 'raster-opacity', 0)
        break
      case 'fill': {
        const colour = /water/.test(id)
          ? p.water
          : /park|wood|grass|wetland|cemetery|pitch/.test(id)
            ? p.park
            : id === 'building'
              ? p.building
              : p.land
        setPaint(map, id, 'fill-color', colour)
        setPaint(map, id, 'fill-outline-color', colour)
        if (id === 'road_area_pattern') setPaint(map, id, 'fill-opacity', 0.2)
        break
      }
      case 'line': {
        const colour = /waterway/.test(id)
          ? p.water
          : /casing/.test(id)
            ? p.casing
            : /rail/.test(id)
              ? p.rail
              : /motorway|trunk|primary|secondary/.test(id)
                ? p.roadMajor
                : /boundary|park_outline|aeroway/.test(id)
                  ? p.rail
                  : p.roadMinor
        setPaint(map, id, 'line-color', colour)
        // Main roads glow softly, like street lights seen from above.
        if (theme === 'night' && /^(road|bridge)_(motorway|trunk_primary)$/.test(id)) setPaint(map, id, 'line-blur', 1.5)
        break
      }
      case 'symbol':
        setPaint(map, id, 'text-color', p.label)
        setPaint(map, id, 'text-halo-color', p.halo)
        setPaint(map, id, 'icon-opacity', theme === 'night' ? 0.6 : 0.8)
        break
      case 'fill-extrusion':
        setPaint(map, id, 'fill-extrusion-color', towerColour(p.towers))
        setPaint(map, id, 'fill-extrusion-opacity', 0.95)
        break
    }
  }
  applyLightAndSky(map, p.light, p.sky)
  map.getContainer().dataset.theme = theme
}

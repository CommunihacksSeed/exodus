import { useEffect, useRef, useState } from 'react'
import type { Map as GlMap, Marker } from 'maplibre-gl'
import type { LatLng } from '../lib/geo.ts'
import { addBeacons, addProposedHeights, addRoute, addWards, boundsOf, clearViewBearing, create3dMap, METRES_PER_STOREY, GRID_BEARING, lngLat, maplibregl, pinElement, TILT } from '../lib/map3d.ts'
import type { ItemStatus } from '../lib/stages.ts'
import { applyTheme, savedTheme, saveTheme, THEMES, type MapTheme } from '../lib/mapTheme.ts'
import { useLang } from '../i18n/index.tsx'

export interface MapPin {
  id: string
  /** Short place name shown beside the marker. */
  label: string
  /** What a screen reader hears for the marker. */
  description: string
  /** One point for a site, several for a route. */
  points: LatLng[]
  status: ItemStatus
  /** Storeys of each proposed building, when the record gives them. */
  proposedStoreys?: number[]
}

interface Props {
  pins: MapPin[]
  /** The decision being summarised: the map flies to it. */
  selectedId: string | null
  /** A decision being pointed at in the list: highlighted, without moving the map. */
  highlightId: string | null
  onSelect: (id: string) => void
  home: { point: LatLng; label: string } | null
}

const STATUS_COLOUR: Record<ItemStatus, string> = { open: '#0a6b43', 'in-progress': '#8a4b00', decided: '#0f1b26' }
/** Beacon colours: brighter versions of the status colours, so they glow against any time of day. */
const BEACON_COLOUR: Record<ItemStatus, string> = { open: '#2fe08a', 'in-progress': '#ffb02e', decided: '#7fa8ff' }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * The whole city in 3D with one marker per decision. Choosing a marker flies
 * down to street level, where the surrounding buildings stand at their real
 * heights. Everything on the map is also in the list beside it, so the page
 * works without the map.
 */
export function CityMap({ pins, selectedId, highlightId, onSelect, home }: Props) {
  const { t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GlMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const onSelectRef = useRef(onSelect)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const firstView = useRef(true)
  const [theme, setTheme] = useState<MapTheme>(savedTheme)
  const [orbiting, setOrbiting] = useState(false)
  const [touring, setTouring] = useState(false)
  const [flat, setFlat] = useState(false)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Build the map once.
  useEffect(() => {
    if (!ref.current) return
    const map = create3dMap(ref.current)
    if (!map) {
      setFailed(true)
      return
    }
    mapRef.current = map
    const markers = markersRef.current
    const overview = boundsOf(pins.flatMap((p) => p.points))
    map.fitBounds(overview, { padding: 70, pitch: TILT, bearing: GRID_BEARING, animate: false })

    for (const pin of pins) {
      const el = pinElement(pin.status, pin.label)
      el.tabIndex = 0
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', pin.description)
      const choose = (e: Event) => {
        e.stopPropagation()
        onSelectRef.current(pin.id)
      }
      el.addEventListener('click', choose)
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        choose(e)
      })
      const at = pin.points[Math.floor(pin.points.length / 2)]
      markers.set(pin.id, new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat(at)).addTo(map))
    }

    map.on('load', () => {
      addWards(map)
      addBeacons(map, pins.map((p) => ({ point: p.points[Math.floor(p.points.length / 2)], colour: BEACON_COLOUR[p.status] })))
      for (const pin of pins) {
        if (pin.proposedStoreys?.length) addProposedHeights(map, `proposed-${pin.id}`, pin.points[0], pin.proposedStoreys)
        if (pin.points.length < 2) continue
        const layer = addRoute(map, `route-${pin.id}`, pin.points, STATUS_COLOUR[pin.status])
        map.on('click', layer, () => onSelectRef.current(pin.id))
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
      }
      setReady(true)
    })

    return () => {
      markers.clear()
      mapRef.current = null
      firstView.current = true
      setReady(false)
      map.remove()
    }
  }, [pins])

  // The resident's address, when they have given one.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !home) return
    const el = pinElement('home', 'Your address')
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat(home.point)).addTo(map)
    return () => {
      marker.remove()
    }
  }, [home, ready])

  // Fly to the chosen decision, or back out to the whole city.
  // With "reduce motion" set in the operating system, jump instead of flying.
  const motion = (ms: number) => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms)
  useEffect(() => {
    const map = mapRef.current
    // Wait for the first draw: an animated move requested before it never starts.
    if (!map || !ready) return
    // On wide screens the summary card sits over the left of the map; keep the marker clear of it.
    const card = ref.current?.parentElement?.querySelector<HTMLElement>('.preview')
    const covered = card && getComputedStyle(card).position === 'absolute' ? card.offsetWidth + 16 : 0
    const pin = pins.find((p) => p.id === selectedId)
    if (!pin) {
      const all = [...pins.flatMap((p) => p.points), ...(home ? [home.point] : [])]
      map.fitBounds(boundsOf(all), { padding: 70, pitch: TILT, bearing: GRID_BEARING, duration: firstView.current ? 0 : motion(1400) })
    } else if (pin.points.length > 1) {
      map.fitBounds(boundsOf(pin.points), {
        padding: { top: 70, bottom: 70, right: 60, left: 60 + covered },
        pitch: TILT,
        bearing: GRID_BEARING,
        duration: motion(1800),
      })
    } else {
      // For a proposed building, arrive from the side where existing towers do not hide it.
      // Buildings near the site may not be loaded yet; then the street-grid view is used.
      const bearing = pin.proposedStoreys?.length
        ? clearViewBearing(map, pin.points[0], Math.max(...pin.proposedStoreys) * METRES_PER_STOREY)
        : GRID_BEARING
      map.flyTo({
        center: lngLat(pin.points[0]),
        zoom: 16.6,
        pitch: 64,
        bearing,
        padding: { top: 0, bottom: 0, right: 0, left: covered },
        duration: motion(2200),
      })
    }
    firstView.current = false
  }, [selectedId, pins, home, ready])

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement()
      el.classList.toggle('is-selected', id === selectedId)
      el.classList.toggle('is-highlighted', id === highlightId && id !== selectedId)
    }
  }, [selectedId, highlightId, ready])

  // Time of day.
  useEffect(() => {
    const map = mapRef.current
    if (map && ready) applyTheme(map, theme)
  }, [theme, ready])

  // Orbit: turn slowly around the centre of the view, like a game's showcase camera.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !orbiting) return
    let frame = 0
    let last = performance.now()
    const turn = (t: number) => {
      map.setBearing(map.getBearing() + ((t - last) / 1000) * 9)
      last = t
      frame = requestAnimationFrame(turn)
    }
    frame = requestAnimationFrame(turn)
    const stop = () => setOrbiting(false)
    const canvas = map.getCanvas()
    canvas.addEventListener('pointerdown', stop)
    canvas.addEventListener('wheel', stop, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', stop)
      canvas.removeEventListener('wheel', stop)
    }
  }, [orbiting, ready])

  // Guided tour: fly to each decision in turn and circle it, showing its summary card.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !touring) return
    let cancelled = false
    const alive = () => !cancelled
    const stop = () => setTouring(false)
    const canvas = map.getCanvas()
    canvas.addEventListener('pointerdown', stop)
    canvas.addEventListener('wheel', stop, { passive: true })
    ;(async () => {
      for (const pin of pins) {
        if (!alive()) return
        onSelectRef.current(pin.id)
        await wait(reducedMotion() ? 2500 : 2600)
        if (!alive()) return
        if (!reducedMotion()) {
          map.easeTo({ bearing: map.getBearing() + 70, duration: 5200, easing: (x) => x })
          await wait(5400)
        } else {
          await wait(2500)
        }
      }
      if (alive()) setTouring(false)
    })()
    return () => {
      cancelled = true
      map.stop()
      canvas.removeEventListener('pointerdown', stop)
      canvas.removeEventListener('wheel', stop)
    }
  }, [touring, ready, pins])

  // 2D / 3D view.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.easeTo({ pitch: flat ? 0 : TILT, duration: reducedMotion() ? 0 : 900 })
    if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', flat ? 'none' : 'visible')
  }, [flat, ready])

  if (failed) {
    return (
      <p className="map-fallback">
        This device cannot draw the 3D map. Every decision on it is in the list on this page.
      </p>
    )
  }
  return (
    <div className="city-map-wrap" data-theme={theme}>
      <div
        ref={ref}
        className="city-map"
        role="application"
        aria-label="3D map of Toronto. Each marker is a decision; press Enter on a marker to see it. With the map focused, W A S D fly, Q and E turn, R and F tilt, plus and minus zoom."
      />
      {ready && (
        <div className="hud" role="toolbar" aria-label={t('Map view')}>
          <div className="hud-group" role="radiogroup" aria-label={t('Time of day')}>
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                role="radio"
                aria-checked={theme === th.id}
                className={theme === th.id ? 'is-on' : ''}
                onClick={() => {
                  setTheme(th.id)
                  saveTheme(th.id)
                }}
              >
                {t(th.label)}
              </button>
            ))}
          </div>
          <div className="hud-group">
            <button type="button" aria-pressed={touring} className={touring ? 'is-on' : ''} onClick={() => { setOrbiting(false); setTouring((v) => !v) }}>
              {touring ? t('■ Stop tour') : t('▶ Tour')}
            </button>
            {!reducedMotion() && (
              <button type="button" aria-pressed={orbiting} className={orbiting ? 'is-on' : ''} onClick={() => { setTouring(false); setOrbiting((v) => !v) }}>
                {t('⟳ Orbit')}
              </button>
            )}
            <button type="button" aria-pressed={flat} className={flat ? 'is-on' : ''} onClick={() => setFlat((v) => !v)}>
              {flat ? t('3D') : t('2D')}
            </button>
          </div>
        </div>
      )}
      {ready && (
        <p className="hud-keys" aria-hidden="true">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {t('fly')} · <kbd>Q</kbd><kbd>E</kbd> {t('turn')} · <kbd>R</kbd><kbd>F</kbd> {t('tilt')} · {t('scroll to zoom')}
        </p>
      )}
    </div>
  )
}

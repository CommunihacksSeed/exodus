import { useEffect, useRef, useState } from 'react'
import type { Map as GlMap, Marker } from 'maplibre-gl'
import type { LatLng } from '../lib/geo.ts'
import { addBeacons, addProposedHeights, addRoute, addWards, boundsOf, clearViewBearing, create3dMap, mapLocale, METRES_PER_STOREY, GRID_BEARING, lngLat, maplibregl, pinElement, TILT } from '../lib/map3d.ts'
import { STATUS_LABEL, type ItemStatus } from '../lib/stages.ts'
import { applyTheme, savedTheme, saveTheme, THEMES, type MapTheme } from '../lib/mapTheme.ts'
import { carFeatures, CITY_HALL, kmh, siteAt, step, type Car, type DriveInput, type Site } from '../lib/drive.ts'
import { translate, useLang } from '../i18n/index.tsx'

export interface MapPin {
  id: string
  /** Short place name shown beside the marker. */
  label: string
  /** What a screen reader hears for the marker, before its status. */
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
  const { lang, t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GlMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const onSelectRef = useRef(onSelect)
  const selectedRef = useRef(selectedId)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const firstView = useRef(true)
  const [theme, setTheme] = useState<MapTheme>(savedTheme)
  const [orbiting, setOrbiting] = useState(false)
  const [touring, setTouring] = useState(false)
  const [flat, setFlat] = useState(false)
  const [driving, setDriving] = useState(false)
  const drivingRef = useRef(false)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [arrived, setArrived] = useState<Site | null>(null)
  const [visited, setVisited] = useState<Set<string>>(() => new Set())
  // On-screen pedals and wheel for touch screens; the keyboard writes to the same input.
  const touchInput = useRef<{ throttle: DriveInput['throttle']; steer: DriveInput['steer'] }>({ throttle: 0, steer: 0 })
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  // Build the map once.
  useEffect(() => {
    if (!ref.current) return
    const map = create3dMap(ref.current, { locale: mapLocale((s, v) => translate(lang, s, v)) })
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
  // The map library takes its button labels only when built, so a language change rebuilds the map.
  }, [pins, lang])

  // Marker labels follow the interface language. The title is the checked English one.
  const statusWord = (status: ItemStatus) => t(STATUS_LABEL[status])
  useEffect(() => {
    for (const pin of pins) markersRef.current.get(pin.id)?.getElement().setAttribute('aria-label', `${pin.description}. ${statusWord(pin.status)}.`)
  })

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
    // While driving, the chase camera owns the view.
    if (drivingRef.current) return
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
      // Pause while the camera is flying somewhere (a chosen marker, the 2D/3D switch): setting the bearing would cancel that flight.
      if (!map.isMoving()) map.setBearing(map.getBearing() + ((t - last) / 1000) * 9)
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
    // The person chose something else (a marker, the list, closing the card): their choice wins and the tour ends.
    const overridden = (id: string) => {
      if (selectedRef.current === id) return false
      setTouring(false)
      return true
    }
    ;(async () => {
      for (const pin of pins) {
        if (!alive()) return
        onSelectRef.current(pin.id)
        await wait(reducedMotion() ? 2500 : 2600)
        if (!alive() || overridden(pin.id)) return
        if (!reducedMotion()) {
          map.easeTo({ bearing: map.getBearing() + 70, duration: 5200, easing: (x) => x })
          await wait(5400)
        } else {
          await wait(2500)
        }
        if (!alive() || overridden(pin.id)) return
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

  // Drive mode: a toy car with a chase camera. Visit every decision on the map.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !driving) return
    drivingRef.current = true
    const container = map.getContainer()
    container.dataset.driving = '1'
    map.keyboard.disable()
    if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', 'visible')

    const sites: Site[] = pins.map((p) => ({ id: p.id, label: p.label, points: p.points }))
    const from = pins.find((p) => p.id === selectedRef.current)
    const startAt = from ? from.points[Math.floor(from.points.length / 2)] : CITY_HALL
    let car: Car = { lat: startAt[0], lng: startAt[1], heading: map.getBearing(), speed: 0 }
    let camBearing = car.heading
    // Starting at a decision counts as arriving there, so the first frame reports it.
    let lastArrived: string | null = null

    map.addSource('cc-car', { type: 'geojson', data: carFeatures(car) })
    map.addLayer({
      id: 'cc-car-shadow',
      type: 'circle',
      source: 'cc-car',
      filter: ['==', ['get', 'kind'], 'body'],
      paint: { 'circle-radius': 40, 'circle-color': '#000', 'circle-opacity': 0.18, 'circle-blur': 0.9, 'circle-pitch-alignment': 'map' },
    })
    map.addLayer({
      id: 'cc-car',
      type: 'fill-extrusion',
      source: 'cc-car',
      paint: {
        'fill-extrusion-color': ['match', ['get', 'kind'], 'body', '#ff3b30', 'cabin', '#16233f', '#fff4b8'],
        'fill-extrusion-base': ['get', 'base'],
        'fill-extrusion-height': ['get', 'top'],
        'fill-extrusion-opacity': 1,
      },
    })

    const keys = new Set<string>()
    const KEYS = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', ' '])
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'escape') return setDriving(false)
      if (!KEYS.has(k)) return
      e.preventDefault() // arrows and space would scroll the page
      keys.add(k)
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const clear = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)

    let frame = 0
    let last = performance.now()
    let lastDash = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const touch = touchInput.current
      const input: DriveInput = {
        throttle: keys.has('arrowup') || keys.has('w') || touch.throttle === 1 ? 1 : keys.has('arrowdown') || keys.has('s') || keys.has(' ') || touch.throttle === -1 ? -1 : 0,
        steer: keys.has('arrowleft') || keys.has('a') || touch.steer === -1 ? -1 : keys.has('arrowright') || keys.has('d') || touch.steer === 1 ? 1 : 0,
        boost: keys.has('shift'),
      }
      car = step(car, input, dt)
      ;(map.getSource('cc-car') as maplibregl.GeoJSONSource | undefined)?.setData(carFeatures(car))
      // The camera swings round behind the car a little after it turns, like a chase camera.
      const diff = ((car.heading - camBearing + 540) % 360) - 180
      camBearing += diff * Math.min(1, dt * 5)
      const h = container.clientHeight
      map.jumpTo({
        center: [car.lng, car.lat],
        bearing: camBearing,
        pitch: 63,
        zoom: 17.7 - Math.min(1.3, Math.abs(car.speed) / 85),
        padding: { top: h * 0.38, bottom: 0, left: 0, right: 0 },
      })
      const at = siteAt(car, sites)
      if ((at?.id ?? null) !== lastArrived) {
        lastArrived = at?.id ?? null
        setArrived(at)
        if (at) setVisited((v) => (v.has(at.id) ? v : new Set(v).add(at.id)))
      }
      if (now - lastDash > 120) {
        lastDash = now
        setSpeedKmh(kmh(car.speed))
      }
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      touchInput.current = { throttle: 0, steer: 0 }
      drivingRef.current = false
      delete container.dataset.driving
      map.keyboard.enable()
      if (map.getLayer('cc-car')) map.removeLayer('cc-car')
      if (map.getLayer('cc-car-shadow')) map.removeLayer('cc-car-shadow')
      if (map.getSource('cc-car')) map.removeSource('cc-car')
      map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 })
      map.easeTo({ pitch: TILT, zoom: 15.5, duration: reducedMotion() ? 0 : 900 })
      setArrived(null)
      setSpeedKmh(0)
    }
  }, [driving, ready, pins])

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
        {t('This device cannot draw the 3D map. Every decision on it is in the list on this page.')}
      </p>
    )
  }
  return (
    <div className="city-map-wrap" data-theme={theme}>
      <div
        ref={ref}
        className="city-map"
        role="application"
        aria-label={t('3D map of Toronto. Each marker is a decision; press Enter on a marker to see it. With the map focused, W A S D fly, Q and E turn, R and F tilt, plus and minus zoom.')}
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
            <button
              type="button"
              aria-pressed={driving}
              className={driving ? 'is-on' : ''}
              onClick={() => {
                setTouring(false)
                setOrbiting(false)
                setFlat(false)
                setDriving((v) => !v)
                // Keys go to the page while driving; take focus off the button so Space does not press it again.
                ;(document.activeElement as HTMLElement | null)?.blur()
              }}
            >
              {driving ? t('■ Stop driving') : t('🚗 Drive')}
            </button>
          </div>
        </div>
      )}
      {ready && !driving && (
        <p className="hud-keys" aria-hidden="true">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {t('fly')} · <kbd>Q</kbd><kbd>E</kbd> {t('turn')} · <kbd>R</kbd><kbd>F</kbd> {t('tilt')} · {t('scroll to zoom')}
        </p>
      )}
      {driving && (
        <>
          <div className="drive-dash" role="status" aria-live="polite">
            <p className="drive-speed">
              <strong>{speedKmh}</strong> km/h
            </p>
            <p className="drive-visited">
              {visited.size >= pins.length
                ? t('You visited every decision on the map!')
                : t('Visited {n} of {total} decisions', { n: visited.size, total: pins.length })}
            </p>
            <ol className="drive-dots" aria-hidden="true">
              {pins.map((p) => (
                <li key={p.id} className={visited.has(p.id) ? 'is-done' : ''} title={p.label} />
              ))}
            </ol>
          </div>
          {arrived && (
            <div className="drive-arrive" role="status">
              <p>{t('You reached {place}.', { place: arrived.label })}</p>
              <button
                type="button"
                onClick={() => {
                  // Park and read: stop driving and open this decision's card.
                  const id = arrived.id
                  setDriving(false)
                  onSelectRef.current(id)
                }}
              >
                {t('See this decision')}
              </button>
            </div>
          )}
          <p className="hud-keys drive-keys" aria-hidden="true">
            <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> {t('drive')} · <kbd>Shift</kbd> {t('boost')} · <kbd>Esc</kbd> {t('stop')}
          </p>
          <div className="drive-pad" aria-hidden="true">
            {(
              [
                ['steer', -1, '◀', 'drive-left'],
                ['throttle', 1, '▲', 'drive-gas'],
                ['throttle', -1, '▼', 'drive-brake'],
                ['steer', 1, '▶', 'drive-right'],
              ] as const
            ).map(([axis, value, label, cls]) => (
              <button
                key={cls}
                type="button"
                tabIndex={-1}
                className={cls}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  touchInput.current = { ...touchInput.current, [axis]: value }
                }}
                onPointerUp={() => (touchInput.current = { ...touchInput.current, [axis]: 0 })}
                onPointerCancel={() => (touchInput.current = { ...touchInput.current, [axis]: 0 })}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

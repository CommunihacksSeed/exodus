import { useEffect, useRef, useState } from 'react'
import type { Map as GlMap, Marker } from 'maplibre-gl'
import type { LatLng } from '../lib/geo.ts'
import { addProposedHeights, addRoute, addWards, boundsOf, create3dMap, GRID_BEARING, lngLat, maplibregl, pinElement, TILT } from '../lib/map3d.ts'
import type { ItemStatus } from '../lib/stages.ts'

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

/**
 * The whole city in 3D with one marker per decision. Choosing a marker flies
 * down to street level, where the surrounding buildings stand at their real
 * heights. Everything on the map is also in the list beside it, so the page
 * works without the map.
 */
export function CityMap({ pins, selectedId, highlightId, onSelect, home }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GlMap | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const onSelectRef = useRef(onSelect)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const firstView = useRef(true)
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
      for (const pin of pins) {
        if (pin.proposedStoreys?.length) addProposedHeights(map, `proposed-${pin.id}`, pin.points[0], pin.proposedStoreys)
        if (pin.points.length < 2) continue
        const layer = `route-${pin.id}`
        addRoute(map, layer, pin.points, STATUS_COLOUR[pin.status])
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
      map.flyTo({
        center: lngLat(pin.points[0]),
        zoom: 16.6,
        pitch: 64,
        bearing: GRID_BEARING,
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

  if (failed) {
    return (
      <p className="map-fallback">
        This device cannot draw the 3D map. Every decision on it is in the list on this page.
      </p>
    )
  }
  return (
    <div
      ref={ref}
      className="city-map"
      role="application"
      aria-label="3D map of Toronto. Each marker is a decision; press Enter on a marker to see it."
    />
  )
}

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { wards } from '../lib/data.ts'
import type { LatLng } from '../lib/geo.ts'
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
}

interface Props {
  pins: MapPin[]
  selectedId: string | null
  onSelect: (id: string) => void
  home: { point: LatLng; label: string } | null
}

const STATUS_COLOUR: Record<ItemStatus, string> = { open: '#0a6b43', 'in-progress': '#8a4b00', decided: '#0f1b26' }

interface Layers {
  marker: L.Marker
  line: L.Polyline | null
}

/**
 * The whole city with one marker per decision. Choosing a marker tells the
 * page which decision to show. Everything on the map is also in the list
 * beside it, so the page works without the map.
 */
export function CityMap({ pins, selectedId, onSelect, home }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef(new Map<string, Layers>())
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Build the map once.
  useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, { scrollWheelZoom: true })
    mapRef.current = map
    // Set the view before adding markers, so each marker's element exists when we label it.
    map.fitBounds(L.latLngBounds(pins.flatMap((p) => p.points)).pad(0.25), { maxZoom: 14 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    for (const w of wards) {
      L.polygon(w.polygons, { color: '#1747c9', weight: 1, opacity: 0.45, fill: false, interactive: false }).addTo(map)
    }

    const layers = layersRef.current
    for (const pin of pins) {
      const line =
        pin.points.length > 1
          ? L.polyline(pin.points, { color: STATUS_COLOUR[pin.status], weight: 6, opacity: 0.85 }).addTo(map)
          : null
      const at = pin.points[Math.floor(pin.points.length / 2)]
      const marker = L.marker(at, {
        icon: L.divIcon({
          className: `pin pin-${pin.status}`,
          html: '<span class="pin-dot"></span>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
        keyboard: true,
        riseOnHover: true,
      })
      // Leaflet builds the marker's element when it is added, so name it then.
      marker.on('add', () => {
        const el = marker.getElement()
        if (!el) return
        el.setAttribute('aria-label', pin.description)
        // Enter or Space on a focused marker does what a click does.
        el.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          onSelectRef.current(pin.id)
        })
      })
      marker.addTo(map)
      marker.bindTooltip(pin.label, { permanent: true, direction: 'top', offset: [0, -14], className: 'pin-label' })
      marker.on('click', () => onSelectRef.current(pin.id))
      line?.on('click', () => onSelectRef.current(pin.id))
      layers.set(pin.id, { marker, line })
    }
    return () => {
      layers.clear()
      mapRef.current = null
      map.remove()
    }
  }, [pins])

  // The resident's address, when they have given one.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !home) return
    const marker = L.marker(home.point, {
      icon: L.divIcon({ className: 'pin pin-home', html: '<span class="pin-dot"></span>', iconSize: [26, 26], iconAnchor: [13, 13] }),
      keyboard: false,
      interactive: false,
    }).addTo(map)
    marker.bindTooltip('Your address', { permanent: true, direction: 'bottom', offset: [0, 10], className: 'pin-label pin-label-home' })
    map.fitBounds(L.latLngBounds([...pins.flatMap((p) => p.points), home.point]).pad(0.25), { maxZoom: 15 })
    return () => {
      marker.remove()
    }
  }, [home, pins])

  // Show which marker is chosen, and bring it into view.
  useEffect(() => {
    const map = mapRef.current
    // On wide screens the summary card sits over the left of the map; keep the marker clear of it.
    const card = ref.current?.parentElement?.querySelector<HTMLElement>('.preview')
    const covered = card && getComputedStyle(card).position === 'absolute' ? card.offsetWidth + 16 : 0
    for (const [id, { marker, line }] of layersRef.current) {
      const on = id === selectedId
      marker.getElement()?.classList.toggle('is-selected', on)
      marker.setZIndexOffset(on ? 1000 : 0)
      line?.setStyle({ weight: on ? 9 : 6, opacity: on ? 1 : 0.85 })
      if (on && map) {
        map.panInside(marker.getLatLng(), { paddingTopLeft: [covered + 90, 70], paddingBottomRight: [90, 50] })
      }
    }
  }, [selectedId])

  return <div ref={ref} className="city-map" role="application" aria-label="Map of Toronto. Each marker is a decision; press Enter on a marker to see it." />
}

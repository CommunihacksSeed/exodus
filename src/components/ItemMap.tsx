import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { wards } from '../lib/data.ts'
import type { LatLng } from '../lib/geo.ts'
import type { Ward } from '../types.ts'

interface Props {
  points: LatLng[]
  label: string
  itemWards: Ward[]
  home: { point: LatLng; label: string } | null
}

/**
 * Map of where the item applies. Uses Leaflet directly (no API key) with
 * OpenStreetMap tiles. The same facts are always given in text next to the
 * map, so nothing depends on being able to see or use it.
 */
export function ItemMap({ points, label, itemWards, home }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const bounds = L.latLngBounds(points)
    for (const w of wards.filter((w) => itemWards.some((iw) => iw.number === w.number))) {
      L.polygon(w.polygons, { color: '#1d4e89', weight: 2, fillOpacity: 0.04, dashArray: '6 6', interactive: false })
        .addTo(map)
        .bindTooltip(`Ward ${w.number}: ${w.name}`)
    }

    if (points.length > 1) {
      L.polyline(points, { color: '#b3261e', weight: 6, opacity: 0.85 }).addTo(map).bindPopup(label)
    } else {
      L.circleMarker(points[0], { radius: 10, color: '#fff', weight: 3, fillColor: '#b3261e', fillOpacity: 1 })
        .addTo(map)
        .bindPopup(label)
    }
    if (home) {
      L.circleMarker(home.point, { radius: 8, color: '#fff', weight: 3, fillColor: '#1d4e89', fillOpacity: 1 })
        .addTo(map)
        .bindPopup(`Address you entered: ${home.label}`)
      bounds.extend(home.point)
    }
    map.fitBounds(bounds.pad(0.35), { maxZoom: 16 })
    return () => {
      map.remove()
    }
  }, [points, label, itemWards, home])

  return (
    <div
      ref={ref}
      className="item-map"
      role="img"
      aria-label={`Map showing ${label}${home ? ` and the address you entered` : ''}`}
    />
  )
}

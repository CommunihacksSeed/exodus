import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '../lib/geo.ts'
import { addProposedHeights, addRoute, addWards, boundsOf, clearViewBearing, create3dMap, mapLocale, whenTilesLoaded, METRES_PER_STOREY, GRID_BEARING, lngLat, maplibregl, pinElement, TILT } from '../lib/map3d.ts'
import type { Ward } from '../types.ts'
import { translate, useLang } from '../i18n/index.tsx'

interface Props {
  points: LatLng[]
  label: string
  itemWards: Ward[]
  home: { point: LatLng; label: string } | null
  /** Storeys of each proposed building, when the record gives them. */
  proposedStoreys?: number[]
}

/**
 * 3D map of where the item applies, with nearby buildings at their real
 * heights. The same facts are always given in text next to the map, so
 * nothing depends on being able to see or use it.
 */
export function ItemMap({ points, label, itemWards, home, proposedStoreys }: Props) {
  const { lang, t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const map = create3dMap(ref.current, { cooperative: true, locale: mapLocale((s, v) => translate(lang, s, v)) })
    if (!map) {
      setFailed(true)
      return
    }
    const isRoute = points.length > 1
    if (isRoute || home) {
      map.fitBounds(boundsOf([...points, ...(home ? [home.point] : [])]), {
        padding: 60,
        pitch: TILT,
        bearing: GRID_BEARING,
        maxZoom: 16,
        animate: false,
      })
    } else {
      map.jumpTo({ center: lngLat(points[0]), zoom: 16.6, pitch: 64, bearing: GRID_BEARING })
    }

    const at = points[Math.floor(points.length / 2)]
    new maplibregl.Marker({ element: pinElement('site', label), anchor: 'center' }).setLngLat(lngLat(at)).addTo(map)
    if (home) {
      new maplibregl.Marker({ element: pinElement('home', 'Your address'), anchor: 'center' }).setLngLat(lngLat(home.point)).addTo(map)
    }
    map.on('load', () => {
      addWards(map, itemWards.map((w) => w.number))
      if (isRoute) addRoute(map, 'route', points, '#b3261e')
      if (proposedStoreys?.length) {
        addProposedHeights(map, 'proposed', points[0], proposedStoreys)
        // Once the buildings around the site have loaded, turn to a view where they do not hide it.
        if (!isRoute && !home) {
          whenTilesLoaded(map, () => {
            const bearing = clearViewBearing(map, points[0], Math.max(...proposedStoreys) * METRES_PER_STOREY)
            if (bearing !== GRID_BEARING) map.easeTo({ bearing, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200 })
          })
        }
      }
    })
    return () => {
      map.remove()
    }
  }, [points, label, itemWards, home, proposedStoreys, lang])

  if (failed) return <p className="map-fallback">{t('This device cannot draw the 3D map. The location is described in the text here.')}</p>
  return (
    <div
      ref={ref}
      className="item-map"
      role="img"
      aria-label={home ? t('3D map showing {place} and the address you entered', { place: label }) : t('3D map showing {place}', { place: label })}
    />
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch.tsx'
import { RouteMini } from '../components/RouteStrip.tsx'
import { items, wards, type WardShape } from '../lib/data.ts'
import { formatDistance, nearestDistance } from '../lib/geo.ts'
import { usePlace } from '../lib/place.tsx'
import { safeHref } from '../lib/safe.ts'
import { itemStatus, STATUS_LABEL } from '../lib/stages.ts'
import { useLang } from '../i18n/index.tsx'

const FIND_COUNCILLOR = 'https://www.toronto.ca/city-government/council/members-of-council/'

/** The ward's outline as a small SVG, drawn from the City's ward boundaries (no map library needed). */
function WardOutline({ ward, home }: { ward: WardShape; home: [number, number] | null }) {
  const { t } = useLang()
  const pts = ward.polygons.flat()
  const lats = pts.map((p) => p[0])
  const lngs = pts.map((p) => p[1])
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180) // keep east-west distances true to scale
  const w = (maxLng - minLng) * k
  const h = maxLat - minLat
  const size = Math.max(w, h)
  const x = (lng: number) => (((lng - minLng) * k + (size - w) / 2) / size) * 100
  const y = (lat: number) => (((maxLat - lat) + (size - h) / 2) / size) * 100
  const d = ward.polygons.map((ring) => 'M' + ring.map(([la, ln]) => `${x(ln).toFixed(2)},${y(la).toFixed(2)}`).join('L') + 'Z').join(' ')
  const inside = home && home[0] >= minLat && home[0] <= maxLat && home[1] >= minLng && home[1] <= maxLng
  return (
    <svg className="ward-shape" viewBox="-4 -4 108 108" role="img" aria-label={t('Outline of Ward {n}, {name}', { n: ward.number, name: ward.name })}>
      <path d={d} />
      {inside && <circle cx={x(home[1])} cy={y(home[0])} r="3.2" className="ward-home" />}
    </svg>
  )
}

/** Everything in Exodus for one ward, chosen by address or from the list. */
export function MyWard() {
  const { t } = useLang()
  const { place } = usePlace()
  const sorted = useMemo(() => [...wards].sort((a, b) => a.number - b.number), [])
  // A ward chosen from the list holds only until a new address is searched; then the address's ward wins.
  const [pick, setPick] = useState<{ n: number | null; place: typeof place } | null>(null)
  const picked = pick && pick.place === place ? pick.n : null
  const wardNo = picked ?? place?.wardNumber ?? null
  const ward = sorted.find((w) => w.number === wardNo) ?? null

  const inWard = ward ? items.filter((i) => i.record.wards.some((w) => w.number === ward.number)) : []
  const nearby = place
    ? items
        .filter((i) => i.explanation && !inWard.includes(i))
        .map((i) => ({ item: i, d: nearestDistance(place.point, i.explanation!.location.points) }))
        .sort((a, b) => a.d - b.d)
    : []

  return (
    <article className="page ward-page">
      <title>{`${ward ? t('Ward {n}: {name}', { n: ward.number, name: ward.name }) : t('My ward')} — Exodus`}</title>
      <p className="kicker">{t('My ward')}</p>
      <h1>{ward ? t('Ward {n}: {name}', { n: ward.number, name: ward.name }) : t('What is happening in my ward?')}</h1>
      <p className="lede">
        {t('Toronto has 25 wards. Each elects one councillor to City Council. Find yours by address, or choose it from the list.')}
      </p>

      <div className="ward-pick">
        <AddressSearch compact />
        <label className="ward-select">
          <span>{t('Or choose a ward')}</span>
          <select value={wardNo ?? ''} onChange={(e) => setPick({ n: e.target.value ? Number(e.target.value) : null, place })}>
            <option value="">{t('Choose…')}</option>
            {sorted.map((w) => (
              <option key={w.number} value={w.number}>
                {t('Ward {n}: {name}', { n: w.number, name: w.name })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ward && (
        <section className="panel ward-card" aria-labelledby="ward-h">
          <WardOutline ward={ward} home={place && place.wardNumber === ward.number ? place.point : null} />
          <div>
            <h2 id="ward-h">{t('Ward {n}: {name}', { n: ward.number, name: ward.name })}</h2>
            {place && place.wardNumber === ward.number && <p className="near-result">{t('{place} is in this ward.', { place: place.label })}</p>}
            <p>
              {t('Your councillor speaks and votes for this ward at City Council. The City lists every councillor and how to reach them.')}
            </p>
            <a className="button" href={safeHref(FIND_COUNCILLOR)} target="_blank" rel="noreferrer">
              {t('Find this ward’s councillor')}<span className="sr-only"> (City of Toronto, opens in a new tab)</span>
            </a>
          </div>
        </section>
      )}

      {ward && (
        <section aria-labelledby="in-ward-h">
          <h2 id="in-ward-h">{t('Decisions in this ward')}</h2>
          {inWard.length > 0 ? (
            <ul className="cards">
              {inWard.map(({ record, explanation }) => (
                <li key={record.id} className="card">
                  <p className="card-top">
                    <span className={`badge badge-status-${itemStatus(record)}`}>{t(STATUS_LABEL[itemStatus(record)])}</span>
                  </p>
                  <h3>
                    <Link to={`/item/${record.id}`} lang="en">{explanation?.plainTitle ?? record.title}</Link>
                  </h3>
                  <RouteMini record={record} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="notice">
              {t('None of the {n} items in this prototype are in Ward {w}. A full version would cover every item on every agenda.', { n: items.length, w: ward.number })}
            </p>
          )}
        </section>
      )}

      {nearby.length > 0 && (
        <section aria-labelledby="nearby-h">
          <h2 id="nearby-h">{t('Nearby, in other wards')}</h2>
          <ul className="nearby">
            {nearby.map(({ item, d }) => (
              <li key={item.record.id}>
                <Link to={`/item/${item.record.id}`} lang="en">{item.explanation!.plainTitle}</Link>{' '}
                <span className="fine">· {t('{distance} from {place}', { distance: formatDistance(d), place: place!.label })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

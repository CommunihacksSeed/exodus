import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch.tsx'
import type { MapPin } from '../components/CityMap.tsx'

// The map library is large; load it after the text so the page is readable at once.
const CityMap = lazy(() => import('../components/CityMap.tsx').then((m) => ({ default: m.CityMap })))
import { RouteMini } from '../components/RouteStrip.tsx'
import { items } from '../lib/data.ts'
import { formatDistance, nearestDistance } from '../lib/geo.ts'
import { usePlace } from '../lib/place.tsx'
import { CAN_ACT, itemStatus, STATUS_LABEL } from '../lib/stages.ts'
import type { PublishedItem } from '../types.ts'
import { useLang } from '../i18n/index.tsx'

const TOPIC_LABEL = { development: 'New building', transit: 'Transit', heritage: 'Heritage and housing' } as const
const ORDER = { open: 0, 'in-progress': 1, decided: 2 } as const

/** One marker per item that has a checked explanation (and so a location). */
const PINS: MapPin[] = items.flatMap(({ record, explanation }) =>
  explanation
    ? [
        {
          id: record.id,
          label: explanation.location.label,
          description: explanation.plainTitle,
          points: explanation.location.points,
          status: itemStatus(record),
          proposedStoreys: explanation.location.proposedStoreys,
        },
      ]
    : [],
)

function ItemCard({
  item,
  distance,
  selected,
  onPoint,
}: {
  item: PublishedItem
  distance: number | null
  selected: boolean
  onPoint: () => void
}) {
  const { t } = useLang()
  const { record, explanation } = item
  const status = itemStatus(record)
  const last = record.considerations.at(-1)
  return (
    <li className="card" data-selected={selected || undefined} onMouseEnter={onPoint} onFocus={onPoint}>
      <p className="card-top">
        <span className={`badge badge-status-${status}`}>{t(STATUS_LABEL[status])}</span>
        {explanation && <span className="topic">{t(TOPIC_LABEL[explanation.topic])}</span>}
      </p>
      <h3>
        <Link to={`/item/${record.id}`} lang="en">{explanation?.plainTitle ?? record.title}</Link>
      </h3>
      <RouteMini record={record} />
      <p className="card-meta">
        {record.wards.map((w) => `Ward ${w.number} ${w.name}`).join(' · ')}
        {distance !== null && <strong> · {t('{distance} from your address', { distance: formatDistance(distance) })}</strong>}
      </p>
      {last && (
        <p className="card-meta">
          {status === 'decided' ? t('Decided by') : t('Next:')} <span lang="en">{last.body}, {last.dateText}</span>
        </p>
      )}
      {!explanation && <p className="card-note">{t('Plain-language explanation not published yet. Official record only.')}</p>}
    </li>
  )
}

/** What a marker stands for: enough to decide whether to read the full page. */
function Preview({ item, distance, onClose }: { item: PublishedItem; distance: number | null; onClose: () => void }) {
  const { t } = useLang()
  const { record, explanation } = item
  const status = itemStatus(record)
  return (
    <section className="preview" aria-live="polite" aria-label={t('Decision at the chosen marker')}>
      <button type="button" className="preview-close" onClick={onClose} aria-label={t('Close this summary')}>
        ×
      </button>
      <p className="card-top">
        <span className={`badge badge-status-${status}`}>{t(STATUS_LABEL[status])}</span>
        {explanation && <span className="topic" lang="en">{explanation.location.label}</span>}
      </p>
      <h2 lang="en">{explanation?.plainTitle ?? record.title}</h2>
      {explanation && <p className="preview-what">{explanation.whatIsProposed[0].text}</p>}
      <RouteMini record={record} />
      <dl className="preview-facts">
        {distance !== null && (
          <div>
            <dt>{t('How far')}</dt>
            <dd>{t('{distance} from your address', { distance: formatDistance(distance) })}</dd>
          </div>
        )}
        <div>
          <dt>{t('Can I have a say?')}</dt>
          <dd>{t(CAN_ACT[status])}</dd>
        </div>
      </dl>
      <Link className="button" to={`/item/${record.id}`}>
        {t('Read the full page')}
      </Link>
    </section>
  )
}

export function Home() {
  const { t } = useLang()
  const { place } = usePlace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pointedId, setPointedId] = useState<string | null>(null)
  const rows = items
    .map((item) => ({
      item,
      distance: place && item.explanation ? nearestDistance(place.point, item.explanation.location.points) : null,
    }))
    .sort(
      (a, b) =>
        ORDER[itemStatus(a.item.record)] - ORDER[itemStatus(b.item.record)] ||
        (a.distance ?? Infinity) - (b.distance ?? Infinity),
    )
  const selected = rows.find((r) => r.item.record.id === selectedId)

  // On a phone the summary sits below the map, so bring it into view after a marker is chosen.
  const fromMap = useRef(false)
  function selectFromMap(id: string) {
    fromMap.current = true
    setSelectedId(id)
  }
  useEffect(() => {
    if (!fromMap.current) return
    fromMap.current = false
    const card = document.querySelector<HTMLElement>('.preview')
    if (card && getComputedStyle(card).position !== 'absolute') {
      // Instant, not smooth: the map is animating at the same moment and can cancel a smooth scroll.
      card.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedId])

  return (
    <div className="home">
      <section className="home-intro">
        <p className="eyebrow">{t('Toronto · City Council and committees')}</p>
        <h1>
          {t('City Hall decisions,')} <span className="mark">{t('in plain words.')}</span>
        </h1>
        <p className="lede">
          {t('Choose a marker to fly there and see what is proposed, who has decided what so far, and whether you can still have a say. Every statement links to the City’s own record.')}
        </p>
      </section>

      <div className="home-map">
        <div className="city-map-frame">
          <Suspense fallback={<div className="city-map city-map-loading" aria-hidden="true" />}>
          <CityMap
            pins={PINS}
            selectedId={selectedId}
            highlightId={pointedId}
            onSelect={selectFromMap}
            home={place ? { point: place.point, label: place.label } : null}
          />
          </Suspense>
          {selected && <Preview item={selected.item} distance={selected.distance} onClose={() => setSelectedId(null)} />}
        </div>
        <ul className="legend" aria-label={t('What the markers mean')}>
          <li>
            <span className="pin pin-open" aria-hidden="true">
              <span className="pin-dot" />
            </span>
            {t('You can still have a say')}
          </li>
          <li>
            <span className="pin pin-decided" aria-hidden="true">
              <span className="pin-dot" />
            </span>
            {t('Decided')}
          </li>
          {place && (
            <li>
              <span className="pin pin-home" aria-hidden="true">
                <span className="pin-dot" />
              </span>
              {t('Your address')}
            </li>
          )}
          <li>
            <span className="swatch-proposed" aria-hidden="true" />
            {t('Height of a proposed building (shape not shown)')}
          </li>
          <li className="legend-note">{t('Blue lines are ward boundaries. Drag with the right mouse button, or two fingers, to turn and tilt.')}</li>
        </ul>
      </div>

      <div className="home-side">
        <AddressSearch />
        <section aria-labelledby="items-heading">
          <h2 id="items-heading">{t('All decisions on the map')}</h2>
          <ul className="cards">
            {rows.map(({ item, distance }) => (
              <ItemCard
                key={item.record.id}
                item={item}
                distance={distance}
                selected={item.record.id === selectedId}
                onPoint={() => setPointedId(item.record.id)}
              />
            ))}
          </ul>
          <p className="fine">
            {t('This is a proof of concept covering {n} real City of Toronto agenda items. It is not a complete list of what City Council is deciding.', { n: items.length })}
          </p>
        </section>
      </div>
    </div>
  )
}

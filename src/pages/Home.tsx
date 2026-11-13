import { Link } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch.tsx'
import { items } from '../lib/data.ts'
import { formatDistance, nearestDistance } from '../lib/geo.ts'
import { usePlace } from '../lib/place.tsx'
import { itemStatus, STATUS_LABEL } from '../lib/stages.ts'
import type { PublishedItem } from '../types.ts'

const TOPIC_LABEL = { development: 'New building', transit: 'Transit', heritage: 'Heritage and housing' } as const
const ORDER = { open: 0, 'in-progress': 1, decided: 2 } as const

function ItemCard({ item, distance }: { item: PublishedItem; distance: number | null }) {
  const { record, explanation } = item
  const status = itemStatus(record)
  const last = record.considerations.at(-1)
  return (
    <li className="card">
      <p className="card-top">
        <span className={`badge badge-status-${status}`}>{STATUS_LABEL[status]}</span>
        {explanation && <span className="topic">{TOPIC_LABEL[explanation.topic]}</span>}
      </p>
      <h3>
        <Link to={`/item/${record.id}`}>{explanation?.plainTitle ?? record.title}</Link>
      </h3>
      <p className="card-meta">
        {record.wards.map((w) => `Ward ${w.number} ${w.name}`).join(' · ')}
        {distance !== null && <strong> · {formatDistance(distance)} from your address</strong>}
      </p>
      {last && (
        <p className="card-meta">
          {status === 'decided' ? 'Decided by' : 'Next:'} {last.body}, {last.dateText}
        </p>
      )}
      {!explanation && <p className="card-note">Plain-language explanation not published yet. Official record only.</p>}
    </li>
  )
}

export function Home() {
  const { place } = usePlace()
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

  return (
    <>
      <section className="hero">
        <h1>City Hall decisions, in plain words.</h1>
        <p className="lede">
          See what is being proposed, whether it is near you, who has decided what so far, and whether you can still have
          a say. Every statement links to the City’s own record.
        </p>
        <AddressSearch />
      </section>

      <section aria-labelledby="items-heading">
        <h2 id="items-heading">Decisions you can look up</h2>
        <ul className="cards">
          {rows.map(({ item, distance }) => (
            <ItemCard key={item.record.id} item={item} distance={distance} />
          ))}
        </ul>
        <p className="fine">
          This is a proof of concept covering {items.length} real City of Toronto agenda items. It is not a complete list
          of what City Council is deciding.
        </p>
      </section>
    </>
  )
}

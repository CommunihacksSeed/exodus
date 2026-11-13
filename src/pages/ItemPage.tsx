import { Link, useParams } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch.tsx'
import { ClaimList } from '../components/Claim.tsx'
import { HaveYourSay } from '../components/HaveYourSay.tsx'
import { ItemMap } from '../components/ItemMap.tsx'
import { StageTracker } from '../components/StageTracker.tsx'
import { findItem, formatCaptured } from '../lib/data.ts'
import { formatDistance, nearestDistance, walkMinutes } from '../lib/geo.ts'
import { usePlace } from '../lib/place.tsx'
import { itemStatus, STATUS_LABEL } from '../lib/stages.ts'

export function ItemPage() {
  const { id = '' } = useParams()
  const item = findItem(id)
  const { place } = usePlace()

  if (!item) {
    return (
      <section>
        <h1>We do not have that item</h1>
        <p>
          <Link to="/">Back to the list</Link>
        </p>
      </section>
    )
  }

  const { record, explanation } = item
  const status = itemStatus(record)
  const captured = formatCaptured(record.retrievedAt)
  const distance = place && explanation ? nearestDistance(place.point, explanation.location.points) : null
  const walk = distance !== null ? walkMinutes(distance) : null
  const sameWard = place?.wardNumber != null && record.wards.some((w) => w.number === place.wardNumber)

  return (
    <article className="item">
      <p className="back">
        <Link to="/">← All decisions</Link>
      </p>

      <header className="item-header">
        <p>
          <span className={`badge badge-status-${status}`}>{STATUS_LABEL[status]}</span>
        </p>
        <h1>{explanation?.plainTitle ?? record.title}</h1>
        <p className="official-title">
          Official title: {record.title} (item {record.id})
        </p>
        <p className="provenance">
          Based on the{' '}
          <a href={record.sourceUrl} target="_blank" rel="noreferrer">
            City of Toronto’s page for this item
          </a>{' '}
          as it was on <strong>{captured}</strong>. The City can change it after that date.
        </p>
      </header>

      {!explanation && (
        <p className="notice">
          A plain-language explanation has not been published for this item yet, because it has not passed our source
          checks. Below is the City’s official record, organised by step.
        </p>
      )}

      <section aria-labelledby="say-h" className="panel panel-say">
        <h2 id="say-h">Can I still have a say?</h2>
        <HaveYourSay item={item} />
      </section>

      {explanation && (
        <>
          <section aria-labelledby="what-h" className="panel">
            <h2 id="what-h">What is being proposed?</h2>
            <ClaimList claims={explanation.whatIsProposed} />
          </section>

          <section aria-labelledby="why-h" className="panel">
            <h2 id="why-h">Why?</h2>
            <ClaimList claims={explanation.why} />
          </section>

          <section aria-labelledby="where-h" className="panel">
            <h2 id="where-h">Is this near me? Who does it affect?</h2>
            <p className="where-line">
              <strong>{explanation.location.label}</strong>, {record.wards.map((w) => `Ward ${w.number} (${w.name})`).join(', ')}
            </p>
            {place && distance !== null ? (
              <p className="near-result" role="status">
                This is <strong>{formatDistance(distance)}</strong> from {place.label}
                {walk ? `, roughly a ${walk}-minute walk in a straight line` : ''}.{' '}
                {sameWard ? 'It is in your ward.' : place.wardName ? `It is not in your ward (${place.wardName}).` : ''}
              </p>
            ) : null}
            <AddressSearch compact />
            <ItemMap
              points={explanation.location.points}
              label={explanation.location.label}
              itemWards={record.wards}
              home={place ? { point: place.point, label: place.label } : null}
            />
            <p className="fine">
              Red marks the site. The dashed line is the ward boundary. Location from: {explanation.location.geocodeSource}.
            </p>
            <ClaimList claims={explanation.whoIsAffected} />
          </section>

          <section aria-labelledby="cond-h" className="panel">
            <h2 id="cond-h">Conditions and things not settled</h2>
            <ClaimList claims={explanation.conditionsAndUnknowns} />
          </section>
        </>
      )}

      <section aria-labelledby="stages-h" className="panel">
        <h2 id="stages-h">Who has decided what so far?</h2>
        <p className="section-intro">
          A proposal usually passes through three kinds of steps. Staff advice and committee votes are not final. Only
          City Council’s decision is.
        </p>
        <StageTracker record={record} summaries={explanation?.stageSummaries} />
        {record.bylaws.length > 0 && (
          <p className="fine">
            By-laws passed for this item:{' '}
            {record.bylaws.map((b, i) => (
              <span key={b.url}>
                {i > 0 && ', '}
                <a href={b.url} target="_blank" rel="noreferrer">
                  {b.label}
                </a>
              </span>
            ))}
          </p>
        )}
      </section>

      {explanation && explanation.whatHappensNext.length > 0 && (
        <section aria-labelledby="next-h" className="panel">
          <h2 id="next-h">What happens next?</h2>
          <ClaimList claims={explanation.whatHappensNext} />
        </section>
      )}

      <section aria-labelledby="trust-h" className="panel panel-trust">
        <h2 id="trust-h">How this page was made</h2>
        <ul className="plain-list">
          <li>
            The steps, dates, votes and official wording are copied by a program from the City’s item page. No AI is
            used for those.
          </li>
          {explanation && (
            <li>
              The plain-language sentences were drafted with help from an AI model
              {explanation.review.humanReviewedBy
                ? ` and checked by ${explanation.review.humanReviewedBy} on ${explanation.review.reviewedOn}.`
                : '. A person has not yet signed off on them.'}{' '}
              Each one quotes the City’s record, and a program confirmed that every quote appears word for word in the
              source before this page could be published.
            </li>
          )}
          <li>Names of residents who wrote or spoke to the City are left out. Only the number of submissions is shown.</li>
          <li>
            Documents listed by the City for this item:
            <ul>
              {[...new Map(record.considerations.flatMap((c) => c.documents).filter((d) => d.url).map((d) => [d.url, d])).values()].map((d) => (
                <li key={d.url}>
                  <a href={d.url!} target="_blank" rel="noreferrer">
                    {d.label}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </section>
    </article>
  )
}

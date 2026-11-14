import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddressSearch } from '../components/AddressSearch.tsx'
import { AtAGlance } from '../components/AtAGlance.tsx'
import { ClaimList } from '../components/Claim.tsx'
import { HaveYourSay } from '../components/HaveYourSay.tsx'

import { ResidentTools } from '../components/ResidentTools.tsx'
import { RouteStrip } from '../components/RouteStrip.tsx'
import { StageTracker } from '../components/StageTracker.tsx'
import { findItem, formatCaptured } from '../lib/data.ts'
import { formatDistance, nearestDistance, walkMinutes } from '../lib/geo.ts'
import { METRES_PER_STOREY } from '../lib/storey.ts'
import { usePlace } from '../lib/place.tsx'
import { itemStatus, STATUS_LABEL } from '../lib/stages.ts'
import { safeHref } from '../lib/safe.ts'
import { fill, useLang } from '../i18n/index.tsx'

// The map library is large; load it after the text so the page is readable at once.
const ItemMap = lazy(() => import('../components/ItemMap.tsx').then((m) => ({ default: m.ItemMap })))

/** In-page jumps. Plain anchors would clash with the hash-based router. */
function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

export function ItemPage() {
  const { id = '' } = useParams()
  const { t } = useLang()
  const item = findItem(id)
  const { place } = usePlace()

  if (!item) {
    return (
      <section>
        <title>Item not found — Clear Council</title>
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
      <title>{`${explanation?.plainTitle ?? record.title} — Clear Council`}</title>
      <p className="back">
        <Link to="/">{t('← All decisions')}</Link>
      </p>

      <header className="item-header">
        <p className="item-kicker">
          <span className={`badge badge-status-${status}`}>{t(STATUS_LABEL[status])}</span>
          <span className="item-id">{t('Item {id}', { id: record.id })}</span>
        </p>
        <h1>{explanation?.plainTitle ?? record.title}</h1>
        <p className="official-title">{t('Official title:')} {record.title}</p>

        <section aria-label={t('Where this proposal is in the process')} className="route-wrap">
          <RouteStrip record={record} />
        </section>

        <AtAGlance item={item} />

        <p className="provenance">
          {fill(t('Based on the {link} as it was on {date}. The City can change it after that date.'), {
            link: (
              <a href={safeHref(record.sourceUrl)} target="_blank" rel="noreferrer">
                {t('City of Toronto’s page for this item')}
              </a>
            ),
            date: <strong>{captured}</strong>,
          })}
        </p>

        <ResidentTools item={item} />
      </header>

      <nav className="jump no-print" aria-label={t('On this page')}>
        {(
          [
            ['say-h', 'Have a say'],
            ...(explanation
              ? ([
                  ['what-h', 'What'],
                  ['why-h', 'Why'],
                  ['where-h', 'Near me?'],
                  ['cond-h', 'Conditions'],
                ] as const)
              : []),
            ['stages-h', 'Who decided'],
            ['trust-h', 'Sources'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => jumpTo(id)}>
            {t(label)}
          </button>
        ))}
      </nav>

      {!explanation && (
        <p className="notice">
          {t('A plain-language explanation has not been published for this item yet, because it has not passed our source checks. Below is the City’s official record, organised by step.')}
        </p>
      )}

      <section aria-labelledby="say-h" className="panel panel-say">
        <h2 id="say-h" tabIndex={-1}>{t('Can I still have a say?')}</h2>
        <HaveYourSay item={item} />
      </section>

      {explanation && (
        <>
          <section aria-labelledby="what-h" className="panel">
            <h2 id="what-h" tabIndex={-1}>{t('What is being proposed?')}</h2>
            <ClaimList claims={explanation.whatIsProposed} />
          </section>

          <section aria-labelledby="why-h" className="panel">
            <h2 id="why-h" tabIndex={-1}>{t('Why?')}</h2>
            <ClaimList claims={explanation.why} />
          </section>

          <section aria-labelledby="where-h" className="panel">
            <h2 id="where-h" tabIndex={-1}>{t('Is this near me? Who does it affect?')}</h2>
            <p className="where-line">
              <strong>{explanation.location.label}</strong>, {record.wards.map((w) => `Ward ${w.number} (${w.name})`).join(', ')}
            </p>
            {place && distance !== null ? (
              <p className="near-result" role="status">
                {fill(t('This is {distance} from {place}.'), { distance: <strong>{formatDistance(distance)}</strong>, place: place.label })}
                {walk ? ` ${t('That is roughly a {n}-minute walk in a straight line.', { n: walk })}` : ''}{' '}
                {sameWard ? t('It is in your ward.') : place.wardName ? t('It is not in your ward ({ward}).', { ward: place.wardName }) : ''}
              </p>
            ) : null}
            <AddressSearch compact />
            <Suspense fallback={<div className="item-map city-map-loading" aria-hidden="true" />}>
            <ItemMap
              points={explanation.location.points}
              label={explanation.location.label}
              itemWards={record.wards}
              home={place ? { point: place.point, label: place.label } : null}
              proposedStoreys={explanation.location.proposedStoreys}
            />
            </Suspense>
            <p className="fine">
              Red marks the {explanation.location.points.length > 1 ? 'route' : 'site'}. The dashed line is the ward boundary.{' '}
              {explanation.location.proposedStoreys?.length
                ? `The yellow ${explanation.location.proposedStoreys.length > 1 ? 'blocks show' : 'block shows'} how tall ${explanation.location.proposedStoreys.join(' and ')} storeys would be beside the buildings there now, one slab per storey, at about ${METRES_PER_STOREY} metres a storey. Only the height comes from the City record; the real building will have a different shape. `
                : ''}
              Other buildings are from OpenStreetMap and may be out of date. Location from: {explanation.location.geocodeSource}.
            </p>
            <ClaimList claims={explanation.whoIsAffected} />
          </section>

          <section aria-labelledby="cond-h" className="panel">
            <h2 id="cond-h" tabIndex={-1}>{t('Conditions and things not settled')}</h2>
            <ClaimList claims={explanation.conditionsAndUnknowns} />
          </section>
        </>
      )}

      <section aria-labelledby="stages-h" className="panel">
        <h2 id="stages-h" tabIndex={-1}>{t('Who has decided what so far?')}</h2>
        <p className="section-intro">
          {t('A proposal usually passes through three kinds of steps. Staff advice and committee votes are not final. Only City Council’s decision is.')}
        </p>
        <StageTracker record={record} summaries={explanation?.stageSummaries} />
        {record.bylaws.length > 0 && (
          <p className="fine">
            By-laws passed for this item:{' '}
            {record.bylaws.map((b, i) => (
              <span key={b.url}>
                {i > 0 && ', '}
                <a href={safeHref(b.url)} target="_blank" rel="noreferrer">
                  {b.label}
                </a>
              </span>
            ))}
          </p>
        )}
      </section>

      {explanation && explanation.whatHappensNext.length > 0 && (
        <section aria-labelledby="next-h" className="panel">
          <h2 id="next-h" tabIndex={-1}>{t('What happens next?')}</h2>
          <ClaimList claims={explanation.whatHappensNext} />
        </section>
      )}

      <section aria-labelledby="trust-h" className="panel panel-trust">
        <h2 id="trust-h" tabIndex={-1}>{t('How this page was made')}</h2>
        <ul className="plain-list">
          <li>
            {t('The steps, dates, votes and official wording are copied by a program from the City’s item page. No AI is used for those.')}
          </li>
          {explanation && (
            <li>
              {explanation.review.humanReviewedBy
                ? t('The plain-language sentences were drafted with help from an AI model and checked by {who} on {date}.', {
                    who: explanation.review.humanReviewedBy,
                    date: explanation.review.reviewedOn ?? '',
                  })
                : t('The plain-language sentences were drafted with help from an AI model. A person has not yet signed off on them.')}{' '}
              {t('Each one quotes the City’s record, and a program confirmed that every quote appears word for word in the source before this page could be published.')}
            </li>
          )}
          <li>{t('Names of residents who wrote or spoke to the City are left out. Only the number of submissions is shown.')}</li>
          <li>
            {t('Documents listed by the City for this item:')}
            <ul>
              {[...new Map(record.considerations.flatMap((c) => c.documents).filter((d) => d.url).map((d) => [d.url, d])).values()].map((d) => (
                <li key={d.url}>
                  <a href={safeHref(d.url!)} target="_blank" rel="noreferrer">
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

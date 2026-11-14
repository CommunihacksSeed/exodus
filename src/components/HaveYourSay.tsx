import type { PublishedItem } from '../types.ts'
import { formatCaptured } from '../lib/data.ts'
import { itemStatus } from '../lib/stages.ts'
import { safeHref } from '../lib/safe.ts'

/**
 * Participation information. Hard rule: only show what the City's own item
 * page offers, say when it was checked, and never derive a deadline from a
 * meeting date.
 */
export function HaveYourSay({ item }: { item: PublishedItem }) {
  const { record, explanation } = item
  const status = itemStatus(record)
  const { commentsUrl, speakUrl } = record.participation
  const captured = formatCaptured(record.retrievedAt)
  const check = explanation?.participationCheck ?? null
  const next = record.considerations.find((c) => !c.sections.some((s) => /(Recommendations|Decision)$/.test(s.heading) && s.heading !== 'Recommendations'))

  if (status === 'open') {
    return (
      <div className="say say-open">
        <p className="say-lead">
          Yes. When we checked on {captured}, the City’s page for this item offered {commentsUrl && speakUrl ? 'two ways' : 'a way'} to take part
          {next ? ` before the ${next.body} meeting on ${next.dateText}` : ''}.
        </p>
        <div className="say-actions">
          {commentsUrl && (
            <a className="button" href={safeHref(commentsUrl)} target="_blank" rel="noreferrer">
              Send a written comment<span className="sr-only"> on the City’s website (opens in a new tab)</span>
            </a>
          )}
          {speakUrl && (
            <a className="button button-secondary" href={safeHref(speakUrl)} target="_blank" rel="noreferrer">
              Ask to speak at the meeting<span className="sr-only"> on the City’s website (opens in a new tab)</span>
            </a>
          )}
        </div>
        <dl className="say-facts">
          <dt>Deadline</dt>
          <dd>
            {check?.deadlineText ? (
              <>“{check.deadlineText}”</>
            ) : (
              <>
                <strong>Not stated on the City’s page.</strong> We do not work out a deadline from the meeting date, because
                that could be wrong. To be safe, send your comment as early as you can
                {check ? ' or confirm the cut-off with the contact below' : ''}.
              </>
            )}
          </dd>
          {check && (
            <>
              <dt>Who to ask</dt>
              <dd>
                {check.contact.label}: <a href={`mailto:${check.contact.email}`}>{check.contact.email}</a> or{' '}
                <a href={`tel:${check.contact.phone.replace(/\D/g, '')}`}>{check.contact.phone}</a> (
                <a href={safeHref(check.contact.sourceUrl)} target="_blank" rel="noreferrer">
                  source
                </a>
                , checked {check.checkedOn})
              </dd>
            </>
          )}
          <dt>Before you write</dt>
          <dd>
            The City treats comments as public records. Your name and your comment will appear online with the meeting
            record.
          </dd>
          {check && (
            <>
              <dt>No internet?</dt>
              <dd>
                Call {check.contact.phone} and ask how to comment on item {record.id}.
              </dd>
            </>
          )}
        </dl>
      </div>
    )
  }

  if (status === 'decided') {
    const council = record.considerations.find((c) => c.kind === 'council')
    return (
      <div className="say say-closed">
        <p className="say-lead">
          Not through the City’s comment form. City Council made its decision on {council?.dateText}, and when we checked on{' '}
          {captured} the City’s page for this item no longer offered a comment or speaker form.
        </p>
        <dl className="say-facts">
          <dt>What you can still do</dt>
          <dd>
            Contact your councillor about how the decision is carried out. Find them at{' '}
            <a href="https://www.toronto.ca/city-government/council/members-of-council/" target="_blank" rel="noreferrer">
              toronto.ca: Members of Council
            </a>
            .
          </dd>
          <dt>Appeals</dt>
          <dd>
            Some decisions can be appealed and some cannot. This tool has not checked whether this one can be, so it does
            not say either way.
          </dd>
        </dl>
      </div>
    )
  }

  return (
    <div className="say say-closed">
      <p className="say-lead">
        When we checked on {captured}, the City’s page for this item did not offer a comment or speaker form. That can
        change as the item moves forward.
      </p>
      <p>
        <a href={safeHref(record.sourceUrl)} target="_blank" rel="noreferrer">
          Check the City’s page for item {record.id}
        </a>
      </p>
    </div>
  )
}

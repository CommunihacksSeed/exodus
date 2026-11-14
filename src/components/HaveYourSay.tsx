import type { PublishedItem } from '../types.ts'
import { formatCaptured } from '../lib/data.ts'
import { itemStatus } from '../lib/stages.ts'
import { safeHref } from '../lib/safe.ts'
import { fill, useLang } from '../i18n/index.tsx'

/**
 * Participation information. Hard rule: only show what the City's own item
 * page offers, say when it was checked, and never derive a deadline from a
 * meeting date.
 */
export function HaveYourSay({ item }: { item: PublishedItem }) {
  const { t } = useLang()
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
          {next
            ? commentsUrl && speakUrl
              ? t('Yes. When we checked on {date}, the City’s page for this item offered two ways to take part before the {body} meeting on {when}.', { date: captured, body: next.body, when: next.dateText })
              : t('Yes. When we checked on {date}, the City’s page for this item offered a way to take part before the {body} meeting on {when}.', { date: captured, body: next.body, when: next.dateText })
            : commentsUrl && speakUrl
              ? t('Yes. When we checked on {date}, the City’s page for this item offered two ways to take part.', { date: captured })
              : t('Yes. When we checked on {date}, the City’s page for this item offered a way to take part.', { date: captured })}
        </p>
        <div className="say-actions">
          {commentsUrl && (
            <a className="button" href={safeHref(commentsUrl)} target="_blank" rel="noreferrer">
              {t('Send a written comment')}<span className="sr-only"> on the City’s website (opens in a new tab)</span>
            </a>
          )}
          {speakUrl && (
            <a className="button button-secondary" href={safeHref(speakUrl)} target="_blank" rel="noreferrer">
              {t('Ask to speak at the meeting')}<span className="sr-only"> on the City’s website (opens in a new tab)</span>
            </a>
          )}
        </div>
        <dl className="say-facts">
          <dt>{t('Deadline')}</dt>
          <dd>
            {check?.deadlineText ? (
              <>“{check.deadlineText}”</>
            ) : (
              <>
                <strong>{t('Not stated on the City’s page.')}</strong>{' '}
                {check
                  ? t('We do not work out a deadline from the meeting date, because that could be wrong. To be safe, send your comment as early as you can or confirm the cut-off with the contact below.')
                  : t('We do not work out a deadline from the meeting date, because that could be wrong. To be safe, send your comment as early as you can.')}
              </>
            )}
          </dd>
          {check && (
            <>
              <dt>{t('Who to ask')}</dt>
              <dd>
                {check.contact.label}: <a href={`mailto:${check.contact.email}`}>{check.contact.email}</a> or{' '}
                <a href={`tel:${check.contact.phone.replace(/\D/g, '')}`}>{check.contact.phone}</a> (
                <a href={safeHref(check.contact.sourceUrl)} target="_blank" rel="noreferrer">
                  {t('source')}
                </a>
                , {t('checked {date}', { date: check.checkedOn })})
              </dd>
            </>
          )}
          <dt>{t('Before you write')}</dt>
          <dd>
            {t('The City treats comments as public records. Your name and your comment will appear online with the meeting record.')}
          </dd>
          {check && (
            <>
              <dt>{t('No internet?')}</dt>
              <dd>
                {t('Call {phone} and ask how to comment on item {id}.', { phone: check.contact.phone, id: record.id })}
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
          {t('Not through the City’s comment form. City Council made its decision on {when}, and when we checked on {date} the City’s page for this item no longer offered a comment or speaker form.', { when: council?.dateText ?? '', date: captured })}
        </p>
        <dl className="say-facts">
          <dt>{t('What you can still do')}</dt>
          <dd>
            {fill(t('Contact your councillor about how the decision is carried out. Find them at {link}.'), {
              link: (
                <a href="https://www.toronto.ca/city-government/council/members-of-council/" target="_blank" rel="noreferrer">
                  {t('toronto.ca: Members of Council')}
                </a>
              ),
            })}
          </dd>
          <dt>{t('Appeals')}</dt>
          <dd>
            {t('Some decisions can be appealed and some cannot. This tool has not checked whether this one can be, so it does not say either way.')}
          </dd>
        </dl>
      </div>
    )
  }

  return (
    <div className="say say-closed">
      <p className="say-lead">
        {t('When we checked on {date}, the City’s page for this item did not offer a comment or speaker form. That can change as the item moves forward.', { date: captured })}
      </p>
      <p>
        <a href={safeHref(record.sourceUrl)} target="_blank" rel="noreferrer">
          {t('Check the City’s page for item {id}', { id: record.id })}
        </a>
      </p>
    </div>
  )
}

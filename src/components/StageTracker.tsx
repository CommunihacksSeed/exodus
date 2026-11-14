import type { Claim, ItemRecord, Motion, StageKind, VerifiedCitation } from '../types.ts'
import { buildStages, type Stage } from '../lib/stages.ts'
import { safeHref } from '../lib/safe.ts'
import { withTerms } from './Term.tsx'
import { fill, useLang } from '../i18n/index.tsx'

function VoteLine({ motion }: { motion: Motion }) {
  const { t } = useLang()
  return (
    <li className="motion">
      <p>
        <strong lang="en">{motion.header.replace(/^\d+ - /, '')}</strong>
        {motion.result && <span className={`result result-${motion.result.toLowerCase()}`} lang="en"> {motion.result}</span>}
      </p>
      {motion.votes.map((v, i) => (
        <details key={i} className="vote">
          <summary>
            <span className="votebar" aria-hidden="true">
              <span className="votebar-yes" style={{ flexGrow: v.yes.length }} />
              <span className="votebar-no" style={{ flexGrow: v.no.length }} />
            </span>
            {v.absent.length
              ? t('Recorded vote: {yes} yes, {no} no, {absent} absent', { yes: v.yes.length, no: v.no.length, absent: v.absent.length })
              : t('Recorded vote: {yes} yes, {no} no', { yes: v.yes.length, no: v.no.length })}{' '}
            — <span lang="en">{v.result}</span>
          </summary>
          <dl>
            <dt>{t('Yes')}</dt>
            <dd>{v.yes.join(', ') || t('None')}</dd>
            <dt>{t('No')}</dt>
            <dd>{v.no.join(', ') || t('None')}</dd>
            {v.absent.length > 0 && (
              <>
                <dt>{t('Absent')}</dt>
                <dd>{v.absent.join(', ')}</dd>
              </>
            )}
          </dl>
          <p className="fine">
            <span lang="en">{v.when}</span>. {t('This vote was on the motion named above, which may be a change to the item rather than the item itself.')}
          </p>
        </details>
      ))}
    </li>
  )
}

function StageCard({ stage, summary, sourceUrl }: { stage: Stage; summary?: Claim<VerifiedCitation>; sourceUrl: string }) {
  const seen = new Set<string>()
  const { t } = useLang()
  const c = stage.consideration
  return (
    <li className={`stage stage-${stage.state}`}>
      <div className="stage-marker" aria-hidden="true" />
      <div className="stage-body">
        <p className="stage-kind">{t(stage.title)}</p>
        <h3 lang="en">{stage.who}</h3>
        <p className="stage-meta">
          {stage.dateText && <span lang="en">{stage.dateText}</span>}
          <span className={`badge badge-${stage.state}`}>{t(stage.badge)}</span>
        </p>
        {summary && (
          <p className="stage-summary" lang="en">
            {summary.text}
          </p>
        )}
        {stage.state === 'not-in-record' && (
          <p className="stage-summary">
            {t('The City’s page for this item does not list a City Council date yet. We do not guess one.')}
          </p>
        )}
        {stage.outcome && (
          <details className="verbatim">
            <summary>
              {t('Official wording:')}{' '}
              {stage.outcome.heading.toLowerCase() === 'recommendations' ? t('staff recommendations') : <span lang="en">{stage.outcome.heading}</span>}
            </summary>
            {stage.outcome.paragraphs.map((p, i) => (
              <p key={i} lang="en">
                {withTerms(p, seen)}
              </p>
            ))}
            <p className="fine">
              {fill(t('Copied word for word from the {link}.'), {
                link: (
                  <a href={safeHref(sourceUrl)} target="_blank" rel="noreferrer">
                    {t('City’s item page')}
                  </a>
                ),
              })}
            </p>
          </details>
        )}
        {c && c.motions.length > 0 && (
          <details className="verbatim">
            <summary>{t('Motions and votes at this meeting ({n})', { n: c.motions.length })}</summary>
            <ul className="motions">
              {c.motions.map((m, i) => (
                <VoteLine key={i} motion={m} />
              ))}
            </ul>
          </details>
        )}
        {c && (c.communicationsCount > 0 || c.speakersCount > 0) && (
          <p className="fine">
            {t('Public input on the record at this step:')}{' '}
            {c.communicationsCount === 1
              ? t('{n} written submission', { n: c.communicationsCount })
              : t('{n} written submissions', { n: c.communicationsCount })}
            {c.speakersCount === 1 ? ` ${t('and {n} speaker', { n: 1 })}` : c.speakersCount > 1 ? ` ${t('and {n} speakers', { n: c.speakersCount })}` : ''}.
          </p>
        )}
      </div>
    </li>
  )
}

export function StageTracker({
  record,
  summaries,
}: {
  record: ItemRecord
  summaries?: Partial<Record<StageKind, Claim<VerifiedCitation>>>
}) {
  const stages = buildStages(record)
  return (
    <ol className="stages">
      {stages.map((s, i) => (
        <StageCard key={i} stage={s} summary={s.state !== 'not-in-record' ? summaries?.[s.kind] : undefined} sourceUrl={record.sourceUrl} />
      ))}
    </ol>
  )
}

import type { Claim, ItemRecord, Motion, StageKind, VerifiedCitation } from '../types.ts'
import { buildStages, type Stage } from '../lib/stages.ts'
import { safeHref } from '../lib/safe.ts'
import { withTerms } from './Term.tsx'
import { useLang } from '../i18n/index.tsx'

function VoteLine({ motion }: { motion: Motion }) {
  return (
    <li className="motion">
      <p>
        <strong>{motion.header.replace(/^\d+ - /, '')}</strong>
        {motion.result && <span className={`result result-${motion.result.toLowerCase()}`}> {motion.result}</span>}
      </p>
      {motion.votes.map((v, i) => (
        <details key={i} className="vote">
          <summary>
            <span className="votebar" aria-hidden="true">
              <span className="votebar-yes" style={{ flexGrow: v.yes.length }} />
              <span className="votebar-no" style={{ flexGrow: v.no.length }} />
            </span>
            Recorded vote: {v.yes.length} yes, {v.no.length} no
            {v.absent.length ? `, ${v.absent.length} absent` : ''} — {v.result}
          </summary>
          <dl>
            <dt>Yes</dt>
            <dd>{v.yes.join(', ') || 'None'}</dd>
            <dt>No</dt>
            <dd>{v.no.join(', ') || 'None'}</dd>
            {v.absent.length > 0 && (
              <>
                <dt>Absent</dt>
                <dd>{v.absent.join(', ')}</dd>
              </>
            )}
          </dl>
          <p className="fine">{v.when}. This vote was on the motion named above, which may be a change to the item rather than the item itself.</p>
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
        <h3>{stage.who}</h3>
        <p className="stage-meta">
          {stage.dateText && <span>{stage.dateText}</span>}
          <span className={`badge badge-${stage.state}`}>{t(stage.badge)}</span>
        </p>
        {summary && <p className="stage-summary">{summary.text}</p>}
        {stage.state === 'not-in-record' && (
          <p className="stage-summary">
            The City’s page for this item does not list a City Council date yet. We do not guess one.
          </p>
        )}
        {stage.outcome && (
          <details className="verbatim">
            <summary>
              Official wording: {stage.outcome.heading.toLowerCase() === 'recommendations' ? 'staff recommendations' : stage.outcome.heading}
            </summary>
            {stage.outcome.paragraphs.map((p, i) => (
              <p key={i}>{withTerms(p, seen)}</p>
            ))}
            <p className="fine">
              Copied word for word from the{' '}
              <a href={safeHref(sourceUrl)} target="_blank" rel="noreferrer">
                City’s item page
              </a>
              .
            </p>
          </details>
        )}
        {c && c.motions.length > 0 && (
          <details className="verbatim">
            <summary>Motions and votes at this meeting ({c.motions.length})</summary>
            <ul className="motions">
              {c.motions.map((m, i) => (
                <VoteLine key={i} motion={m} />
              ))}
            </ul>
          </details>
        )}
        {c && (c.communicationsCount > 0 || c.speakersCount > 0) && (
          <p className="fine">
            Public input on the record at this step: {c.communicationsCount} written{' '}
            {c.communicationsCount === 1 ? 'submission' : 'submissions'}
            {c.speakersCount > 0 ? ` and ${c.speakersCount} ${c.speakersCount === 1 ? 'speaker' : 'speakers'}` : ''}.
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

import type { ItemRecord } from '../types.ts'
import { buildStages, currentIndex, type Stage } from '../lib/stages.ts'
import { useLang, type Translate } from '../i18n/index.tsx'

/**
 * The "route": a proposal drawn like a transit line, one stop per step.
 * A stop is filled only when the City record contains that body's decision.
 */

const KIND_WORD = { staff: 'Staff', committee: 'Committee', council: 'Council' } as const

function describe(stages: Stage[], here: number, t: Translate): string {
  const s = stages[here]
  return t('Step {n} of {total}: {who}. {status}.', { n: here + 1, total: stages.length, who: s.who, status: t(s.badge) })
}

export function RouteStrip({ record }: { record: ItemRecord }) {
  const { t } = useLang()
  const stages = buildStages(record)
  const here = currentIndex(stages)
  return (
    <ol className="route" style={{ ['--stops' as string]: stages.length }}>
      {stages.map((s, i) => (
        <li key={i} className={`stop stop-${s.state}`} aria-current={i === here ? 'step' : undefined}>
          <span className="stop-dot" aria-hidden="true" />
          <span className="stop-who" lang={s.kind === 'staff' ? undefined : 'en'}>
            {s.kind === 'staff' ? t('City staff') : s.who}
          </span>
          {s.dateText && (
            <span className="stop-date" lang="en">
              {s.dateText}
            </span>
          )}
          <span className="stop-badge">{t(s.badge)}</span>
          {i === here && <span className="stop-here">{s.state === 'scheduled' ? t('Next stop') : t('Final stop')}</span>}
        </li>
      ))}
    </ol>
  )
}

/** Small version for list cards: dots and one-word labels only. */
export function RouteMini({ record }: { record: ItemRecord }) {
  const { t } = useLang()
  const stages = buildStages(record)
  const here = currentIndex(stages)
  return (
    <ol className="route route-mini" aria-label={describe(stages, here, t)}>
      {stages.map((s, i) => (
        <li key={i} className={`stop stop-${s.state}`} aria-hidden="true" data-here={i === here || undefined}>
          <span className="stop-dot" />
          <span className="stop-who">{t(KIND_WORD[s.kind])}</span>
        </li>
      ))}
    </ol>
  )
}

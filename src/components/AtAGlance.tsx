import type { PublishedItem } from '../types.ts'
import { buildStages, CAN_ACT, currentIndex, itemStatus } from '../lib/stages.ts'
import { useLang } from '../i18n/index.tsx'

/**
 * Four short answers for someone who will read nothing else.
 * "What" reuses the first source-checked claim; the rest come from the record.
 */
export function AtAGlance({ item }: { item: PublishedItem }) {
  const { t } = useLang()
  const { record, explanation } = item
  const status = itemStatus(record)
  const stages = buildStages(record)
  const here = stages[currentIndex(stages)]
  const canAct = t(CAN_ACT[status])

  return (
    <dl className="glance">
      {explanation && (
        <div className="glance-what">
          <dt>{t('What')}</dt>
          <dd>{explanation.whatIsProposed[0].text}</dd>
        </div>
      )}
      <div>
        <dt>{t('Where')}</dt>
        <dd>
          {explanation ? `${explanation.location.label}. ` : ''}
          {record.wards.map((w) => `Ward ${w.number}`).join(', ')}
        </dd>
      </div>
      <div>
        <dt>{t('Where it stands')}</dt>
        <dd>
          {here.who}: {t(here.badge)}
          {here.dateText ? ` (${here.dateText})` : ''}
        </dd>
      </div>
      <div className={`glance-act glance-act-${status}`}>
        <dt>{t('Can I have a say?')}</dt>
        <dd>{canAct}</dd>
      </div>
    </dl>
  )
}

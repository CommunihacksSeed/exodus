import type { PublishedItem } from '../types.ts'
import { buildStages, currentIndex, itemStatus } from '../lib/stages.ts'

/**
 * Four short answers for someone who will read nothing else.
 * "What" reuses the first source-checked claim; the rest come from the record.
 */
export function AtAGlance({ item }: { item: PublishedItem }) {
  const { record, explanation } = item
  const status = itemStatus(record)
  const stages = buildStages(record)
  const here = stages[currentIndex(stages)]
  const canAct = {
    open: 'Yes. The City is taking comments and requests to speak.',
    decided: 'Not through the City’s comment form. Council has decided.',
    'in-progress': 'Not right now. The City’s page shows no comment form.',
  }[status]

  return (
    <dl className="glance">
      {explanation && (
        <div className="glance-what">
          <dt>What</dt>
          <dd>{explanation.whatIsProposed[0].text}</dd>
        </div>
      )}
      <div>
        <dt>Where</dt>
        <dd>
          {explanation ? `${explanation.location.label}. ` : ''}
          {record.wards.map((w) => `Ward ${w.number}`).join(', ')}
        </dd>
      </div>
      <div>
        <dt>Where it stands</dt>
        <dd>
          {here.who}: {here.badge.toLowerCase()}
          {here.dateText ? ` (${here.dateText})` : ''}
        </dd>
      </div>
      <div className={`glance-act glance-act-${status}`}>
        <dt>Can I have a say?</dt>
        <dd>{canAct}</dd>
      </div>
    </dl>
  )
}

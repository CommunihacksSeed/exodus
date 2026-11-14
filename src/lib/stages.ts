/**
 * Turns a parsed City record into the resident-facing "who has said what so
 * far" timeline. Everything here is rule-based and reads only the record:
 * a stage is "decided" only when the record contains that body's decision.
 * Calendar dates are never used to guess that something has happened.
 */
import type { Consideration, ItemRecord, Section, StageKind } from '../types.ts'

export type StageState = 'advice' | 'decided' | 'scheduled' | 'not-in-record'

export interface Stage {
  kind: StageKind
  /** Plain label for the kind of step. */
  title: string
  who: string
  /** Verbatim date wording from the record ("" when none). */
  dateText: string
  state: StageState
  /** Short plain-language status. */
  badge: string
  /** The body's own words (recommendation or decision), verbatim. */
  outcome: Section | null
  consideration: Consideration | null
}

/** Plain wording for the City's "Status" field. Unknown values pass through verbatim. */
export const STATUS_WORDS: Record<string, string> = {
  Adopted: 'Approved as recommended',
  Amended: 'Approved with changes',
  'Without Recs': 'Passed on with no recommendation',
  Received: 'Received for information (no action)',
  Deferred: 'Postponed',
  Referred: 'Sent to another body',
}

const isOutcomeHeading = (h: string) => h !== 'Recommendations' && /(Recommendations|Decision)$/.test(h)

export function outcomeOf(c: Consideration): Section | null {
  return c.sections.find((s) => isOutcomeHeading(s.heading)) ?? null
}

export function buildStages(record: ItemRecord): Stage[] {
  const stages: Stage[] = []

  // 1. Staff advice: the report that started the item.
  const withOrigin = record.considerations.find((c) => c.sections.some((s) => s.heading === 'Origin'))
  const origin = withOrigin?.sections.find((s) => s.heading === 'Origin')?.paragraphs[0]
  if (origin) {
    const m = origin.match(/^\((.+?)\)\s*(.*)$/)
    stages.push({
      kind: 'staff',
      title: 'City staff advice',
      who: m ? m[2] : origin,
      dateText: m ? m[1] : '',
      state: 'advice',
      badge: 'Advice only — not a decision',
      outcome: withOrigin?.sections.find((s) => s.heading === 'Recommendations') ?? null,
      consideration: null,
    })
  }

  // 2. Each body that has the item on its agenda, oldest first.
  for (const c of record.considerations) {
    const outcome = outcomeOf(c)
    const status = c.meta['Status']
    const decided = outcome !== null
    stages.push({
      kind: c.kind,
      title: c.kind === 'council' ? 'City Council — final decision' : 'Committee or board review',
      who: c.body,
      dateText: c.dateText,
      state: decided ? 'decided' : 'scheduled',
      badge: decided ? (status ? (STATUS_WORDS[status] ?? status) : 'Considered') : 'Scheduled — not decided yet',
      outcome,
      consideration: c,
    })
  }

  // 3. If Council is not in the record yet, say so instead of leaving a gap.
  if (!record.considerations.some((c) => c.kind === 'council')) {
    stages.push({
      kind: 'council',
      title: 'City Council — final decision',
      who: 'City Council',
      dateText: '',
      state: 'not-in-record',
      badge: 'No date in the City record yet',
      outcome: null,
      consideration: null,
    })
  }
  return stages
}

/** The stop the item is waiting at: the first undecided body, else the last decided one. */
export function currentIndex(stages: Stage[]): number {
  const waiting = stages.findIndex((s) => s.state === 'scheduled')
  if (waiting >= 0) return waiting
  return stages.reduce((last, s, i) => (s.state === 'decided' ? i : last), 0)
}

export type ItemStatus = 'open' | 'decided' | 'in-progress'

/** Overall status, again from the record only. */
export function itemStatus(record: ItemRecord): ItemStatus {
  const council = record.considerations.find((c) => c.kind === 'council')
  if (council && outcomeOf(council)) return 'decided'
  if (record.participation.commentsUrl || record.participation.speakUrl) return 'open'
  return 'in-progress'
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'You can still have a say',
  decided: 'Decided',
  'in-progress': 'In progress',
}

/** Short answer to "can I have a say?", from the record only. */
export const CAN_ACT: Record<ItemStatus, string> = {
  open: 'Yes. The City is taking comments and requests to speak.',
  decided: 'Not through the City’s comment form. Council has decided.',
  'in-progress': 'Not right now. The City’s page shows no comment form.',
}

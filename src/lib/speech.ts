/**
 * "Listen to this page": what is read aloud, in order.
 * Only text already on the page is read; nothing is summarised or reworded, and nothing leaves the device
 * (the browser's own speech engine is used).
 */
import type { PublishedItem } from '../types.ts'
import { CAN_ACT, itemStatus } from './stages.ts'

export interface SpeechSegment {
  /** id of the heading of the section being read, so the page can highlight it. */
  sectionId: string
  text: string
}

export function speechSegments(item: PublishedItem): SpeechSegment[] {
  const { record, explanation } = item
  const out: SpeechSegment[] = [
    { sectionId: 'top', text: explanation?.plainTitle ?? record.title },
    { sectionId: 'say-h', text: `Can I still have a say? ${CAN_ACT[itemStatus(record)]}` },
  ]
  if (!explanation) {
    out.push({
      sectionId: 'top',
      text: 'A plain-language explanation has not been published for this item yet. The official record is shown on the page.',
    })
    return out
  }
  const sections: [string, string, { text: string; caveat?: string }[]][] = [
    ['what-h', 'What is being proposed?', explanation.whatIsProposed],
    ['why-h', 'Why?', explanation.why],
    ['where-h', 'Who does it affect?', explanation.whoIsAffected],
    ['cond-h', 'Conditions and things not settled.', explanation.conditionsAndUnknowns],
    ['next-h', 'What happens next?', explanation.whatHappensNext],
  ]
  for (const [sectionId, heading, claims] of sections) {
    if (claims.length === 0) continue
    out.push({ sectionId, text: heading })
    for (const c of claims) {
      out.push({ sectionId, text: c.text })
      if (c.caveat) out.push({ sectionId, text: `Keep in mind: ${c.caveat}` })
    }
  }
  out.push({
    sectionId: 'trust-h',
    text: 'Every sentence on this page links to the City record it comes from. Open the sources on the page to check them.',
  })
  return out
}

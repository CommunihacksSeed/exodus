/**
 * Shared data model. The pipeline (Node) writes these shapes and the web app
 * (browser) reads them, so both sides import from this single file.
 */

/** Who made (or will make) a call on the item at a given step. */
export type StageKind = 'staff' | 'committee' | 'council'

export interface Ward {
  number: number
  name: string
}

export interface Vote {
  /** e.g. "Amend Item", "Adopt Item as Amended" — verbatim from the record. */
  motionType: string
  /** Verbatim date/time string from the record, e.g. "Jul-30-2026 2:40 PM". */
  when: string
  result: string
  /** e.g. "Majority Required - NY34.12 - Carroll - motion 1" */
  note: string
  yes: string[]
  no: string[]
  absent: string[]
}

export interface Motion {
  /** Verbatim header, e.g. "1 - Motion to Amend Item moved by Councillor X". */
  header: string
  /** "Carried", "Lost", ... or null when the record does not state one. */
  result: string | null
  paragraphs: string[]
  votes: Vote[]
}

export interface DocumentLink {
  /** Heading it was listed under, e.g. "Background Information (Community Council)". */
  group: string
  label: string
  url: string | null
}

export interface Section {
  /** Verbatim heading from the record, e.g. "City Council Decision". */
  heading: string
  paragraphs: string[]
}

/** One body's consideration of the item (one accordion card on the City page). */
export interface Consideration {
  body: string
  kind: Exclude<StageKind, 'staff'>
  /** Verbatim, e.g. "July 29 and 30, 2026". */
  dateText: string
  /** ISO days parsed from dateText, e.g. ["2026-07-29", "2026-07-30"]. */
  dates: string[]
  /** "Decision Type" / "Consideration Type", "Status", ... verbatim. */
  meta: Record<string, string>
  wards: Ward[]
  /** Italic notices such as "Public Notice Given". */
  notices: string[]
  sections: Section[]
  documents: DocumentLink[]
  /**
   * Public correspondence is reduced to counts at parse time. Names of
   * residents who wrote in or spoke are deliberately never stored.
   */
  communicationsCount: number
  speakersCount: number
  motions: Motion[]
}

export interface ItemRecord {
  id: string
  title: string
  sourceUrl: string
  /** ISO timestamp of when the City page was captured. */
  retrievedAt: string
  wards: Ward[]
  /** Verbatim "Tracking Status" lines from the top of the City page. */
  trackingStatus: string[]
  bylaws: { label: string; url: string }[]
  /** Oldest first. */
  considerations: Consideration[]
  /**
   * Only what the official item page itself offers. A missing entry means the
   * page showed no such option when captured — never inferred from dates.
   */
  participation: {
    commentsUrl: string | null
    speakUrl: string | null
  }
}

/* ---------- Plain-language explanation (authored, then machine-checked) ---------- */

export interface Citation {
  /** "item" = the City's item page; otherwise a document id from sources. */
  source: string
  /** Exact words copied from the source. Checked verbatim by the pipeline. */
  quote: string
}

export interface VerifiedCitation extends Citation {
  verified: boolean
  /** Deep link to the passage (text fragment or PDF page). */
  url: string
  sourceLabel: string
  /** Date of the source document, as stated by the City. */
  sourceDate: string
  page: number | null
}

export interface Claim<C = Citation> {
  text: string
  citations: C[]
  /** Set when the record itself leaves something open or conditional. */
  caveat?: string
}

export interface SourceDoc {
  id: string
  label: string
  url: string
  /** Date printed on the document, verbatim. */
  date: string
  /** File under data/documents with extracted page text; absent for "item". */
  textFile?: string
}

export interface Explanation<C = Citation> {
  itemId: string
  /** Short resident-facing title. */
  plainTitle: string
  /** One of a small fixed set, used for the icon/label only. */
  topic: 'development' | 'transit' | 'heritage'
  sources: SourceDoc[]
  whatIsProposed: Claim<C>[]
  why: Claim<C>[]
  whoIsAffected: Claim<C>[]
  /** Conditions, amendments and open questions that must not be lost. */
  conditionsAndUnknowns: Claim<C>[]
  /** Per-stage one-liners, keyed by stage kind. */
  stageSummaries: Partial<Record<StageKind, Claim<C>>>
  whatHappensNext: Claim<C>[]
  location: {
    label: string
    /** [lat, lng] points; a line when more than one. */
    points: [number, number][]
    /** Where the coordinates came from. */
    geocodeSource: string
  }
  /**
   * What a person checked on the City's own participation pages, and when.
   * Null when nobody has checked. Never derived from a meeting date.
   */
  participationCheck: {
    checkedOn: string
    /** Exact deadline wording from the City page, or null if none is stated. */
    deadlineText: string | null
    contact: { label: string; email: string; phone: string; sourceUrl: string }
  } | null
  review: {
    aiAssisted: boolean
    /** Name/role of the human who checked it against the record, or null. */
    humanReviewedBy: string | null
    reviewedOn: string | null
  }
}

export interface PublishedItem {
  record: ItemRecord
  explanation: Explanation<VerifiedCitation> | null
}

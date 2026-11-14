/**
 * "Add to my calendar" for meetings that the City record says are scheduled.
 *
 * Rules, from the challenge brief:
 *  - Only a meeting date copied from the record. Never a deadline, and never a date worked out from one.
 *  - Only bodies that have not decided yet, and only dates that have not passed.
 *  - The event text says plainly that it is a meeting date, not a deadline to comment.
 */
import type { ItemRecord } from '../types.ts'
import { buildStages } from './stages.ts'

export interface Meeting {
  body: string
  /** ISO day, e.g. "2026-11-16". */
  date: string
  /** Verbatim date wording from the record. */
  dateText: string
}

/** Today's date in Toronto as an ISO day. */
export function torontoToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

/** Upcoming meetings for bodies the record shows as scheduled but not decided. */
export function upcomingMeetings(record: ItemRecord, today = torontoToday()): Meeting[] {
  return buildStages(record)
    .filter((s) => s.state === 'scheduled' && s.consideration)
    .flatMap((s) =>
      s.consideration!.dates
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today)
        .map((date) => ({ body: s.who, date, dateText: s.dateText })),
    )
}

/** RFC 5545 text escaping, plus a hard cap so a long title cannot bloat the file. */
function esc(text: string): string {
  return text
    .slice(0, 900)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** RFC 5545 line folding at 75 octets (approximated by characters, which is safe for ASCII). */
function fold(line: string): string {
  const out: string[] = []
  for (let i = 0; i < line.length; i += 74) out.push((i ? ' ' : '') + line.slice(i, i + 74))
  return out.join('\r\n')
}

const compact = (iso: string) => iso.replace(/-/g, '')

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** An .ics file with one all-day event per meeting day. */
export function meetingsToIcs(record: ItemRecord, title: string, meetings: Meeting[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clear Council//Meeting dates//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const m of meetings) {
    const description =
      `${m.body} is scheduled to consider item ${record.id} (${m.dateText}), according to the City of Toronto record. ` +
      `This is a meeting date, not a deadline to comment. Check the City page for how and when to have a say: ${record.sourceUrl}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${esc(record.id)}-${compact(m.date)}-${esc(m.body).replace(/[^A-Za-z0-9]/g, '')}@clear-council`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(m.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(m.date))}`,
      fold(`SUMMARY:${esc(`${m.body} meeting: ${title}`)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      fold(`URL:${record.sourceUrl}`),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

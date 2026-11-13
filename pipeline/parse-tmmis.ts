/**
 * Deterministic parser for a City of Toronto TMMIS "Agenda Item History" page.
 * No AI is involved here: every field is copied from the page markup.
 *
 * Input:  a saved copy of the page's <main> element, prefixed with
 *         <!-- source: URL | retrieved: ISO-TIMESTAMP -->
 * Output: an ItemRecord (see src/types.ts).
 */
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import type {
  Consideration,
  DocumentLink,
  ItemRecord,
  Motion,
  Section,
  Vote,
  Ward,
} from '../src/types.ts'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const clean = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

/** "July 29 and 30, 2026" -> ["2026-07-29", "2026-07-30"]. Unknown formats -> []. */
export function parseDates(text: string): string[] {
  const m = text.match(/([A-Z][a-z]+) (\d{1,2})(?:(?:,| and|,? and) (\d{1,2}))*, (\d{4})/)
  if (!m) return []
  const month = MONTHS.indexOf(m[1])
  if (month < 0) return []
  const year = m[4]
  const days = [...m[0].replace(/, \d{4}$/, '').matchAll(/\d{1,2}/g)].map((d) => d[0])
  return days.map((d) => `${year}-${String(month + 1).padStart(2, '0')}-${d.padStart(2, '0')}`)
}

export function parseWards(text: string): Ward[] {
  return [...text.matchAll(/(\d+) - (.+?)(?=, \d+ - |$)/g)].map((m) => ({
    number: Number(m[1]),
    name: clean(m[2]),
  }))
}

function paragraphs($: cheerio.CheerioAPI, el: Element): string[] {
  const ps = $(el).find('p').toArray()
  const blocks = ps.length ? ps : [el]
  return blocks
    .flatMap((p) => {
      // <br> inside a paragraph separates list entries on TMMIS pages.
      const html = $(p).html() ?? ''
      return html.split(/<br\s*\/?>/i).map((part) => clean(cheerio.load(part).text()))
    })
    .filter(Boolean)
}

function parseVoteTable($: cheerio.CheerioAPI, header: Element, table: Element): Vote {
  const h = $(header)
  const when = clean(h.find('small').text())
  const motionType = clean(h.find('span').first().text()).replace(/^\(|\)$/g, '')
  const ths = $(table).find('thead th').toArray().map((th) => clean($(th).text()))
  const names = (label: string) => {
    const row = $(table)
      .find('tbody tr')
      .toArray()
      .find((tr) => clean($(tr).find('td').first().text()).includes(label))
    if (!row) return []
    const cell = $(row).find('td').eq(1).clone()
    cell.find('.sr-only').remove()
    return clean(cell.text()).split(',').map(clean).filter(Boolean)
  }
  return {
    motionType,
    when,
    result: (ths[0] ?? '').replace(/^Result:\s*/, ''),
    note: ths[1] ?? '',
    yes: names('Yes:'),
    no: names('No:'),
    absent: names('Absent:'),
  }
}

function parseMotions($: cheerio.CheerioAPI, container: Element): Motion[] {
  return $(container)
    .children('div')
    .toArray()
    .map((div): Motion | null => {
      const head = $(div).children('div.italics').first()
      if (!head.length) return null
      const result = clean(head.find('span').last().text()).replace(/^\(|\)$/g, '') || null
      const headClone = head.clone()
      headClone.find('span').remove()
      const body = $(div).children('div.wep').toArray()
      const votes: Vote[] = $(div)
        .children('h4.vote-table-header')
        .toArray()
        .map((h) => {
          const table = $(h).nextAll('table').first().get(0)
          return table ? parseVoteTable($, h, table) : null
        })
        .filter((v): v is Vote => v !== null)
      return {
        header: clean(headClone.text()),
        result,
        paragraphs: body.flatMap((b) => paragraphs($, b)),
        votes,
      }
    })
    .filter((m): m is Motion => m !== null)
}

function parseDocuments($: cheerio.CheerioAPI, container: Element, group: string): DocumentLink[] {
  const docs: DocumentLink[] = []
  $(container)
    .children()
    .each((_, child) => {
      const el = $(child)
      if (child.tagName === 'span') docs.push({ group, label: clean(el.text()), url: null })
      if (child.tagName === 'a' && docs.length) docs[docs.length - 1].url = el.attr('href') ?? null
    })
  return docs
}

function parseConsideration($: cheerio.CheerioAPI, card: Element): Consideration {
  const heading = clean($(card).find('.card-header button').first().text())
  const hm = heading.match(/^(.*) consideration on (.*)$/)
  const body = hm ? hm[1] : heading
  const dateText = hm ? hm[2] : ''
  const bodyEl = $(card).find('.card-body').first()

  const meta: Record<string, string> = {}
  bodyEl.find('dl').each((_, dl) => {
    const key = clean($(dl).find('dt').text()).replace(/:$/, '')
    meta[key] = clean($(dl).find('dd').text())
  })

  const c: Consideration = {
    body,
    kind: body === 'City Council' ? 'council' : 'committee',
    dateText,
    dates: parseDates(dateText),
    meta,
    wards: parseWards(meta['Ward'] ?? meta['Wards'] ?? ''),
    notices: [],
    sections: [],
    documents: [],
    communicationsCount: 0,
    speakersCount: 0,
    motions: [],
  }

  bodyEl
    .find('h4')
    .not('.vote-table-header')
    .each((_, h4) => {
      const title = clean($(h4).text())
      if ($(h4).hasClass('italics')) {
        c.notices.push(title)
        return
      }
      // The section body is the element(s) between this heading and the next.
      const content = $(h4).nextUntil('h4').toArray().filter((n: AnyNode) => n.type === 'tag') as Element[]
      const first = content[0]
      if (!first) return
      if (/^Background Information/.test(title)) {
        c.documents.push(...parseDocuments($, first, title))
      } else if (/^Communications/.test(title)) {
        // The Council card repeats the committee's list as "Communications
        // (Community Council)"; counting it again would overstate the input.
        const group = title.match(/\((.+)\)/)?.[1]
        if (group && (group === 'City Council') !== (c.kind === 'council')) return
        // Count only. Correspondents' names are intentionally discarded here.
        c.communicationsCount += $(first).children('span').length
      } else if (/^Speakers/.test(title)) {
        const html = $(first).html() ?? ''
        c.speakersCount += html.split(/<br\s*\/?>/i).map(clean).filter(Boolean).length
      } else if (/^Motions/.test(title)) {
        c.motions.push(...parseMotions($, first))
      } else {
        const section: Section = { heading: title, paragraphs: content.flatMap((el) => paragraphs($, el)) }
        c.sections.push(section)
      }
    })

  return c
}

export function parseTmmisItem(html: string): ItemRecord {
  const header = html.match(/<!-- source: (\S+) \| retrieved: (\S+) -->/)
  if (!header) throw new Error('Snapshot is missing its "source | retrieved" header comment')
  const [, sourceUrl, retrievedAt] = header
  const id = new URL(sourceUrl).searchParams.get('item')
  if (!id) throw new Error(`No item id in ${sourceUrl}`)

  const $ = cheerio.load(html)
  const cards = $('#agenda-item-accordion > .card').toArray()
  // The City lists the most recent consideration first; we store oldest first.
  const considerations = cards.map((card) => parseConsideration($, card)).reverse()

  const statusList = $('h2.section-title')
    .filter((_, h) => clean($(h).text()) === 'Tracking Status')
    .next()
    .find('li')
    .toArray()
  const bylaws: ItemRecord['bylaws'] = []
  const trackingStatus: string[] = []
  for (const li of statusList) {
    const text = clean($(li).text())
    if (/^See also By-laws?/.test(text)) {
      $(li).find('a').each((_, a) => {
        bylaws.push({ label: `By-law ${clean($(a).text())}`, url: $(a).attr('href') ?? '' })
      })
    } else {
      trackingStatus.push(text)
    }
  }

  const title = clean($('h3.heading').first().text()).replace(/^[A-Z]+\d+\.\d+ - /, '')
  const base = 'https://secure.toronto.ca/council/#/public-participation/' + id
  const wards = considerations.at(-1)?.wards ?? []

  return {
    id,
    title,
    sourceUrl,
    retrievedAt,
    wards,
    trackingStatus,
    bylaws,
    considerations,
    participation: {
      commentsUrl: $('#btSbComments').length ? `${base}/comments` : null,
      speakUrl: $('#btRqSpeak').length ? `${base}/speaking-request` : null,
    },
  }
}

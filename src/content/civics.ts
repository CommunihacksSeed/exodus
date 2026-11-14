/**
 * Content for the explainer pages: how City Hall decides, and the glossary.
 *
 * Same rule as the item pages: every passage shown as a quote must appear word for word in a
 * saved copy of its source. `npm test` and `npm run data` check this (pipeline/civics.ts).
 *
 * Two kinds of text:
 *  - Facts about the process (the "How decisions are made" page) are claims; each one's quote
 *    says the same thing.
 *  - Glossary definitions are plain-language explanations written by the Clear Council team. Each is
 *    paired with a passage from a City document where the word is used, so a reader can see it in
 *    context. The page says so; it never presents a definition as the City's own wording.
 */

export interface CivicSource {
  id: string
  label: string
  url: string
  /** Date the saved copy was made, or the date printed on the document. */
  date: string
  /** Saved copy under data/, used to check quotes. */
  file: string
}

export const CIVIC_SOURCES: CivicSource[] = [
  {
    id: 'participate',
    label: 'City of Toronto: Participate in Council & Committee Meetings',
    url: 'https://www.toronto.ca/city-government/council/council-committee-meetings/participate/',
    date: 'captured 2026-11-14',
    file: 'data/civics/participate.txt',
  },
  {
    id: 'members',
    label: 'City of Toronto: Members of Council',
    url: 'https://www.toronto.ca/city-government/council/members-of-council/',
    date: 'captured 2026-11-14',
    file: 'data/civics/members-of-council.txt',
  },
  {
    id: 'official-plan',
    label: 'City of Toronto: Official Plan',
    url: 'https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/official-plan/',
    date: 'captured 2026-11-14',
    file: 'data/civics/official-plan.txt',
  },
  {
    id: 'zoning',
    label: 'City of Toronto: Zoning By-law & Preliminary Zoning Reviews',
    url: 'https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/',
    date: 'captured 2026-11-14',
    file: 'data/civics/zoning.txt',
  },
  {
    id: 'heritage',
    label: 'City of Toronto: Heritage Preservation',
    url: 'https://www.toronto.ca/city-government/planning-development/heritage-preservation/',
    date: 'captured 2026-11-14',
    file: 'data/civics/heritage.txt',
  },
  {
    id: 'report-1337-queen',
    label: 'Staff report: 1337 Queen Street West, Section 42 of the Ontario Heritage Act',
    url: 'https://www.toronto.ca/legdocs/mmis/2027/pb/bgrd/backgroundfile-290746.pdf',
    date: 'October 28, 2026',
    file: 'data/documents/backgroundfile-290746.pages.json',
  },
  {
    id: 'notice-245-eglinton',
    label: 'Notice of public meeting: 245 Eglinton Avenue East',
    url: 'https://www.toronto.ca/legdocs/mmis/2026/ny/bgrd/backgroundfile-287838.pdf',
    date: '2026',
    file: 'data/documents/backgroundfile-287838.pages.json',
  },
  {
    id: 'item-245-eglinton',
    label: 'City Council record: item 2026.NY34.12, 245 Eglinton Avenue East',
    url: 'https://secure.toronto.ca/council/agenda-item.do?item=2026.NY34.12',
    date: 'captured 2026-11-12',
    file: 'data/snapshots/tmmis-2026.NY34.12.html',
  },
]

export interface Sourced {
  /** Plain-language text shown to the reader. */
  text: string
  /** Exact words from the source. Checked verbatim (whitespace-insensitive). */
  quote: string
  source: CivicSource['id']
}

/* ---------------------------------------------------------------- How decisions are made */

export interface ProcessStop {
  id: 'staff' | 'committee' | 'council' | 'after'
  title: string
  who: string
  /** What happens at this stop. */
  facts: Sourced[]
  /** What a resident can do at this stop. */
  youCan: string
}

export const PROCESS: ProcessStop[] = [
  {
    id: 'staff',
    title: 'City staff advise',
    who: 'Planners, heritage staff and other City experts',
    facts: [
      {
        text: 'Staff study the matter and write a report that recommends what City Council should do. A recommendation is advice, not a decision.',
        quote: 'This report recommends that City Council approve the demolition of an existing building',
        source: 'report-1337-queen',
      },
    ],
    youCan:
      'Read the staff report. It is listed on the item’s page, and every item page here links to it. Contact information for the planner is often in the report.',
  },
  {
    id: 'committee',
    title: 'A committee or board reviews',
    who: 'A committee of councillors, a community council, or a board such as the Toronto Preservation Board',
    facts: [
      {
        text: 'The item goes to a public meeting of a smaller group first. Residents can send a written comment or ask to speak about a specific item.',
        quote: 'You can submit comments in writing or speak at a Committee or Board meeting about specific agenda items.',
        source: 'participate',
      },
      {
        text: 'A person who speaks usually has five minutes.',
        quote: 'Public Presentations are limited to five minutes, unless the committee decides otherwise',
        source: 'participate',
      },
      {
        text: 'Some boards only advise. The Toronto Preservation Board, for example, advises City Council on heritage.',
        quote: 'The Toronto Preservation Board provides advice to City Council on heritage preservation.',
        source: 'heritage',
      },
    ],
    youCan:
      'This is usually the best stop to have a say in person. Use the item’s “Request to Speak” or “Submit Comments” buttons on the City’s page. Your name and comment become public.',
  },
  {
    id: 'council',
    title: 'City Council decides',
    who: 'The Mayor and 25 councillors',
    facts: [
      {
        text: 'City Council has 26 members: the Mayor, elected by the whole city, and one councillor for each of the 25 wards.',
        quote: 'City Council is made up of 26 members',
        source: 'members',
      },
      {
        text: 'Members can move motions to change an item before the final vote. Each motion is voted on separately, so one vote may be on a change rather than the whole item.',
        quote: 'Motion to Amend Item moved by Councillor Shelley Carroll (Carried)',
        source: 'item-245-eglinton',
      },
      {
        text: 'Members of the public are not normally heard at City Council meetings themselves.',
        quote: 'Presenters are not heard at meetings of City Council, unless there is a legislated requirement to do so.',
        source: 'participate',
      },
    ],
    youCan:
      'You can still write to City Council about an item on its agenda, and you can contact your own councillor before the vote.',
  },
  {
    id: 'after',
    title: 'After the decision',
    who: 'City staff, and sometimes a provincial tribunal',
    facts: [
      {
        text: 'Many planning decisions are put into effect by changing the Official Plan or the Zoning By-law.',
        quote: 'City Council adopted PH7.5 Official Plan and Zoning By-law Amendments',
        source: 'report-1337-queen',
      },
      {
        text: 'Some planning decisions can be appealed to the Ontario Land Tribunal, a provincial body.',
        quote: 'appeal the decision of the Council of the City of Toronto to the Ontario Land Tribunal',
        source: 'notice-245-eglinton',
      },
    ],
    youCan: 'Ask the City Clerk or the planner named in the report about appeal rights and what happens next.',
  },
]

/* ---------------------------------------------------------------- Glossary */

export interface Term {
  id: string
  term: string
  /** Other spellings to recognise in City text, lower case. The term itself is always included. */
  aliases?: string[]
  /** Plain-language explanation by the Clear Council team. */
  meaning: string
  /** Where the word is used in a City document. */
  inContext: Omit<Sourced, 'text'>
  group: 'People and meetings' | 'Decisions and votes' | 'Planning' | 'Heritage'
}

export const GLOSSARY: Term[] = [
  {
    id: 'agenda-item',
    term: 'Agenda item',
    aliases: ['agenda items'],
    meaning: 'One matter on a meeting’s agenda, with its own number, such as 2027.PB1.6. Comments and requests to speak are made on a specific item.',
    inContext: { quote: 'speak at a Committee or Board meeting about specific agenda items', source: 'participate' },
    group: 'People and meetings',
  },
  {
    id: 'staff-report',
    term: 'Staff report',
    aliases: ['report for action', 'decision report'],
    meaning: 'A report by City staff that explains a matter and recommends what to do. It is advice. Councillors make the decision.',
    inContext: { quote: 'This report recommends that City Council approve', source: 'report-1337-queen' },
    group: 'People and meetings',
  },
  {
    id: 'community-council',
    term: 'Community Council',
    aliases: ['community councils'],
    meaning: 'A committee of the councillors for one part of the city, such as North York or Toronto and East York. Local matters, including many planning items, go there before City Council.',
    inContext: { quote: 'To: Toronto Preservation Board Toronto and East York Community Council', source: 'report-1337-queen' },
    group: 'People and meetings',
  },
  {
    id: 'preservation-board',
    term: 'Toronto Preservation Board',
    meaning: 'A board that gives City Council advice on heritage buildings and districts. It advises; it does not make the final decision.',
    inContext: { quote: 'The Toronto Preservation Board provides advice to City Council on heritage preservation.', source: 'heritage' },
    group: 'People and meetings',
  },
  {
    id: 'city-council',
    term: 'City Council',
    meaning: 'The Mayor and the 25 ward councillors. City Council makes the final decision on most items.',
    inContext: { quote: 'City Council is made up of 26 members', source: 'members' },
    group: 'People and meetings',
  },
  {
    id: 'ward',
    term: 'Ward',
    aliases: ['wards'],
    meaning: 'One of the 25 areas of Toronto. Each ward elects one councillor.',
    inContext: { quote: '25 Councillors who are elected in each ward across the city', source: 'members' },
    group: 'People and meetings',
  },
  {
    id: 'request-to-speak',
    term: 'Request to speak',
    aliases: ['deputation', 'deputations', 'public presentation', 'public presentations'],
    meaning: 'Asking to talk to a committee or board about an item at its meeting (sometimes called a deputation). Speakers usually get five minutes.',
    inContext: { quote: 'Public Presentations are limited to five minutes, unless the committee decides otherwise', source: 'participate' },
    group: 'People and meetings',
  },
  {
    id: 'written-comment',
    term: 'Written comment',
    aliases: ['submit comments', 'communications'],
    meaning: 'A letter or online comment about an item, sent to the committee or Council. It becomes part of the public record, with your name.',
    inContext: { quote: 'Your comments and name will become part of the public record', source: 'participate' },
    group: 'People and meetings',
  },
  {
    id: 'motion',
    term: 'Motion',
    aliases: ['motions'],
    meaning: 'A formal proposal made by a member at a meeting, which members then vote on. Common motions are to adopt an item, to amend it, or to defer it.',
    inContext: { quote: 'Motion to Adopt Item as Amended moved by Councillor Rachel Chernos Lin (Lost)', source: 'item-245-eglinton' },
    group: 'Decisions and votes',
  },
  {
    id: 'amend',
    term: 'Amend',
    aliases: ['amended', 'amendment', 'amendments', 'amending'],
    meaning: 'To change. A motion to amend changes what an item says before it is voted on. In planning, an amendment is also a change to the Official Plan or the Zoning By-law.',
    inContext: { quote: 'Motion to Amend Item moved by Councillor Shelley Carroll (Carried)', source: 'item-245-eglinton' },
    group: 'Decisions and votes',
  },
  {
    id: 'carried-lost',
    term: 'Carried / Lost',
    aliases: ['carried', 'lost'],
    meaning: '“Carried” means a motion passed. “Lost” means it failed.',
    inContext: { quote: 'Result: Carried Majority Required', source: 'item-245-eglinton' },
    group: 'Decisions and votes',
  },
  {
    id: 'adopted',
    term: 'Adopted',
    aliases: ['adopt'],
    meaning: 'Approved. “Adopted as amended” means approved with changes.',
    inContext: { quote: 'City Council on July 29 and 30, 2026, adopted the following', source: 'item-245-eglinton' },
    group: 'Decisions and votes',
  },
  {
    id: 'official-plan',
    term: 'Official Plan',
    meaning: 'The City’s long-term plan for how Toronto should grow: where homes, jobs, transit and parks should go. Big changes to a site often need the plan to be changed first.',
    inContext: {
      quote: 'The Official Plan is intended to ensure that the City of Toronto evolves, improves and realises its full potential',
      source: 'official-plan',
    },
    group: 'Planning',
  },
  {
    id: 'zoning-by-law',
    term: 'Zoning By-law',
    aliases: ['zoning by-laws', 'zoning'],
    meaning: 'The detailed rules for what can be built on each property: uses, height, size and setbacks. A building that breaks these rules needs the by-law changed or a variance.',
    inContext: { quote: 'Most Toronto properties are governed by Zoning By-law 569-2013.', source: 'zoning' },
    group: 'Planning',
  },
  {
    id: 'by-law',
    term: 'By-law',
    aliases: ['by-laws', 'bylaw', 'bylaws'],
    meaning: 'A local law passed by City Council. Council passes by-laws to put many of its decisions into effect.',
    inContext: { quote: 'Official Plan and Zoning By-law Amendments', source: 'report-1337-queen' },
    group: 'Planning',
  },
  {
    id: 'planning-act',
    term: 'Planning Act',
    meaning: 'The Ontario law that sets the rules for land-use planning in every Ontario city, including Toronto.',
    inContext: { quote: 'The Planning Act guides development in the Province of Ontario.', source: 'report-1337-queen' },
    group: 'Planning',
  },
  {
    id: 'olt',
    term: 'Ontario Land Tribunal',
    aliases: ['olt'],
    meaning: 'A provincial tribunal that hears appeals of some planning decisions made by City Council.',
    inContext: { quote: 'appeal the decision of the Council of the City of Toronto to the Ontario Land Tribunal', source: 'notice-245-eglinton' },
    group: 'Planning',
  },
  {
    id: 'storey',
    term: 'Storey',
    aliases: ['storeys'],
    meaning: 'One floor of a building. On the maps here, each storey is drawn about 3 metres tall.',
    inContext: { quote: 'a new 16-storey mixed-use tower with a 4-storey podium', source: 'report-1337-queen' },
    group: 'Planning',
  },
  {
    id: 'podium',
    term: 'Podium',
    meaning: 'The lower, wider base of a tall building, often with shops at street level, with a slimmer tower above it.',
    inContext: { quote: 'a new 16-storey mixed-use tower with a 4-storey podium', source: 'report-1337-queen' },
    group: 'Planning',
  },
  {
    id: 'hcd',
    term: 'Heritage Conservation District',
    aliases: ['heritage conservation districts'],
    meaning: 'An area the City protects for its historic character. Changes to buildings inside it, including demolition, need heritage approval.',
    inContext: { quote: 'within the Parkdale Main Street Heritage Conservation District (PHCD)', source: 'report-1337-queen' },
    group: 'Heritage',
  },
  {
    id: 'ontario-heritage-act',
    term: 'Ontario Heritage Act',
    aliases: ['section 42'],
    meaning: 'The Ontario law that protects heritage properties. Section 42 deals with changes to properties inside a Heritage Conservation District, including tearing down and putting up buildings.',
    inContext: {
      quote: 'approve the erection of a replacement building in accordance with Section 42 of the Ontario Heritage Act',
      source: 'report-1337-queen',
    },
    group: 'Heritage',
  },
  {
    id: 'heritage-permit',
    term: 'Heritage permit',
    aliases: ['heritage permits'],
    meaning: 'Permission from the City to change, tear down or build on a protected heritage property.',
    inContext: { quote: 'A heritage permit for the project was previously approved on June 24 and 25, 2026, by City Council.', source: 'report-1337-queen' },
    group: 'Heritage',
  },
]

export const sourceById = (id: string) => CIVIC_SOURCES.find((s) => s.id === id)!

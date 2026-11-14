# Clear Council

**City Hall decisions, in plain words.** A proof of concept for CIVIC Hack 2026, challenge
*"Making municipal decisions easier to understand"*.

For a real City of Toronto agenda item, Clear Council shows a resident:

- **What is proposed and why**, in plain language
- **Is it near me?** The home page is a 3D map of the city with a marker for each decision;
  choosing a marker flies down to the street and shows what is proposed, with a block as tall
  as the proposed building beside the buildings there now. Each item also has its own map, the ward, and the distance from an
  address they choose
- **Who has decided what so far**, keeping staff advice, committee review and the final
  City Council decision clearly apart
- **Can I still have a say?** Only what the City's own item page offers, with the date it was
  checked. A deadline is never worked out from a meeting date.
- **Where every statement comes from**: the exact quoted passage, the document, its date and a link

Around the item pages:

- **A game-style 3D city.** Day, dusk and night; each proposed building drawn storey by storey
  beside the buildings there now; a guided tour that flies to every decision; fly with W A S D;
  full screen. The camera picks a side where existing towers do not hide the proposal.
- **Listen, add to calendar, share.** Any item page can be read aloud. An upcoming meeting can go
  in your calendar, labelled as a meeting date and never as a deadline.
- **How decisions are made**: the route every item takes, with the real items at each stop.
- **Words**: City Hall words in plain language, also explained in place on item pages.
- **My ward**: everything in your ward, by address or from a list.
- **How we check**: live numbers from the published data and one sentence beside its source.
- **English, Français, 中文** for the interface. Explanations stay in English because each
  sentence is checked word for word against the City's English record.
- **Works offline** for pages already opened. See [SECURITY.md](SECURITY.md) for what the site
  contacts and how it is locked down.

## Run it

```bash
npm install
npm run data   # parse City records, check every quote, write src/generated/
npm run dev    # open the printed http://localhost:5173 address
```

```bash
npm test              # parser, stages, distance, links, calendar, voices, explainer quotes, translations
npm run review-sheet  # write docs/REVIEW.md: each sentence beside its sources, for human sign-off
```

`npm run data` stops with an error and publishes nothing if any quoted passage cannot be found
word for word in its source.

To re-create the page text used for quote checking, download the PDFs listed under
[Data sources](#data-sources) into `data/documents/` and run `npm run pdf-text`.

## How it works

Full design document with UML diagrams, rationale, scalability and references:
[docs/DESIGN.md](docs/DESIGN.md).

```
data/snapshots/*.html        saved copies of the City's item pages (source URL + capture time in line 1)
data/documents/*.pages.json  page-by-page text of the City's PDF reports
data/explanations/*.json     plain-language claims, each with verbatim quotes from a source
data/geo/city-wards.geojson  ward boundaries
        │
        ▼  pipeline/  (Node, runs at build time)
parse-tmmis.ts   rule-based parser: stages, decisions, motions, votes, documents. No AI.
extract-pdf.ts   PDF -> text per page (pdf.js)
build.ts         joins everything, verifies every quote, adds deep links, writes src/generated/
        │
        ▼  src/  (React, runs in the browser, no server)
lib/stages.ts    record -> staff / committee / council timeline (rules only)
lib/geo.ts       distance maths and the City address lookup
components/      Claim (statement + sources), StageTracker, HaveYourSay, CityMap, ItemMap, AddressSearch
pages/           Home (city map with the same decisions as a list) and ItemPage
```

Design rules that come straight from the challenge brief:

| Rule | Where it is enforced |
|---|---|
| Separate staff recommendation, committee decision, Council decision | `src/lib/stages.ts`: a step counts as decided only if the record contains that body's decision text |
| Source and date for each explanation | `Claim` component; `build.ts` attaches label, date, page and link to every citation |
| A wrong summary is worse than none | `build.ts` fails the build on any unverifiable quote; items without a checked explanation show the official record only |
| Never infer a deadline from a meeting date | `HaveYourSay` shows a deadline only if a person copied its wording from the City page (`participationCheck.deadlineText`) |
| No unnecessary personal information | `parse-tmmis.ts` reduces correspondence and speakers to counts; residents' names are never stored |
| Neutral tone | Explanations describe; staff opinions are labelled as staff opinions |

## Data sources

All data is public. Retrieved 2026-11-12 unless noted.

| Source | Used for |
|---|---|
| City of Toronto TMMIS item pages: [2027.PB1.6](https://secure.toronto.ca/council/agenda-item.do?item=2027.PB1.6), [2026.NY34.12](https://secure.toronto.ca/council/agenda-item.do?item=2026.NY34.12), [2026.TE34.104](https://secure.toronto.ca/council/agenda-item.do?item=2026.TE34.104) | Stages, decisions, motions, votes, document lists |
| Staff reports (PDF): [290746](https://www.toronto.ca/legdocs/mmis/2027/pb/bgrd/backgroundfile-290746.pdf), [287824](https://www.toronto.ca/legdocs/mmis/2026/ny/bgrd/backgroundfile-287824.pdf), [287838](https://www.toronto.ca/legdocs/mmis/2026/ny/bgrd/backgroundfile-287838.pdf), [288607](https://www.toronto.ca/legdocs/mmis/2026/te/bgrd/backgroundfile-288607.pdf) | Quoted passages |
| [City Wards](https://open.toronto.ca/dataset/city-wards/), Toronto Open Data (refreshed 2026-02-20) | Ward outlines on the map |
| [Members of Toronto City Council – Voting Record](https://open.toronto.ca/dataset/members-of-toronto-city-council-voting-record/), Toronto Open Data (refreshed 2026-11-07) | Choosing test items with recorded votes |
| City of Toronto geocoder (`map.toronto.ca/cotgeocoder`) | Address lookup and site coordinates |
| OpenStreetMap data, served as vector tiles by [OpenFreeMap](https://openfreemap.org) (no key or account) | 3D base map and the heights of existing buildings |

City data is used under the [Open Government Licence – Toronto](https://open.toronto.ca/open-data-license/).

## Design

The interface borrows from transit wayfinding: a decision is drawn as a route with one stop per
step (staff, committee, Council), and a stop is filled only when the City record contains that
body's decision. Quoted source passages are shown highlighted. Headings use Overpass and reading
text uses Atkinson Hyperlegible, a typeface made for low-vision readers; both are bundled, so the
site makes no font requests to third parties. Every item page has a print view for passing a
paper copy to someone who is not online.

## Submission documents

| Document | What it is |
|---|---|
| [docs/DESIGN.md](docs/DESIGN.md) | Requirements, UML diagrams, design rationale, scalability, code walk-through, AI disclosure, references |
| [docs/readiness-report/](docs/readiness-report/) | Municipal Readiness Report (text and filled template) |
| [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md) | Script and shot list for the demo video |
| [docs/REVIEW.md](docs/REVIEW.md) | Sheet for the human reviewer: each sentence beside its sources |
| [docs/SUBMISSION.md](docs/SUBMISSION.md) | Devpost text and the final checklist |

## Known limits

- Three items only. Item pages were captured through a normal browser session; the City site
  does not allow scripted downloads, so a municipality running this would connect it to its
  own meeting system instead.
- A page reflects the City record on its capture date. Agendas change.
- The map shows one point per site, not the legal boundary of the land.
- On the 3D map, existing buildings come from OpenStreetMap and can be missing or out of date.
  The yellow block for a proposed building shows height only (storeys from a checked quote, at
  about 3 metres a storey) on a plain square; it is not the building's real shape. Toronto is
  drawn flat: ground elevation is not shown.
- The 3D map needs WebGL. Without it the page says so and the list still works.
- The voting record covers recorded votes only, and a vote may be on an amendment rather than
  the item. The app labels each vote with its motion.
- Interface in English, French and Chinese (screen-reader labels and map controls included);
  explanations and City records in English only, marked as English for screen readers. The
  translations have not been reviewed by native speakers yet.
- Offline only for pages already opened; the map and address lookup need a connection. No phone channel.

## Use of AI

This project was built with AI assistance, disclosed as the hackathon rules require.

- **Code**: written with Claude (Anthropic) through Claude Code, directed and reviewed by the team.
- **Plain-language explanations** in `data/explanations/`: drafted with Claude from the City's
  documents. Each sentence carries verbatim quotes that `pipeline/build.ts` checks against the
  source text. A second, separate Claude session then compared each sentence with its sources and
  flagged wording that went beyond them; those sentences were corrected. Neither step replaces a
  person: `review.humanReviewedBy` records whether someone has signed off, the app shows this on
  every page, and [docs/REVIEW.md](docs/REVIEW.md) is the sheet they work from.
- **No AI at run time**: the published site calls no AI model. Stages, dates, votes and official
  wording are extracted by ordinary code.

## Credits

React, Vite, TypeScript, React Router, MapLibre GL JS, cheerio, pdf.js (pdfjs-dist), tsx, oxlint.
Fonts: Overpass and Overpass Mono (SIL Open Font License), Atkinson Hyperlegible (SIL Open Font
License, Braille Institute), via Fontsource.
Versions, licences and algorithm references are listed in [docs/DESIGN.md](docs/DESIGN.md#11-references).

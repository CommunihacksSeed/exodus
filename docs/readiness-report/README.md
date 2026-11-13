# Municipal Readiness Report — draft text

Text for the organizers’ one-page template (`CIVIC-Hack_submission-template.docx`).
The filled template is `readiness-report-draft.docx` in this folder. Team name, contact email and
member details still need to be added before exporting it to PDF.

**Project name:** Clear Council

## The problem (60 words)

Residents cannot tell from a council agenda what is proposed near them, who has decided it, or whether they can still comment. An item can span several meetings and a 30-page report. We focused on explaining real items accurately: staff advice kept apart from committee and Council decisions, conditions preserved, and participation shown only as the City states it.

## Your solution (60 words)

Clear Council gives each agenda item one web page. Residents see a plain-language summary, a map with the distance from their address, a route showing which body has decided what, and how to comment. Clerks and councillors’ offices can share it. Every sentence shows the passage it rests on, checked word for word by software before publishing.

## What changes (30 words)

Today the record is published but not explained. Clear Council explains it without loosening accuracy: unverified text cannot be published and deadlines are never guessed. Tested on three Toronto items.

## Data sources and tools

| Dataset / tool | Source and assumptions |
|---|---|
| Council item pages, staff reports, public notice | City of Toronto (TMMIS, toronto.ca), retrieved 2026-11-12; assumed current then |
| City Wards; Council Voting Record | Toronto Open Data |
| Address lookup; base map | City of Toronto geocoder; OpenStreetMap |
| React, Leaflet, cheerio, pdf.js | Open-source libraries |
| Claude (Anthropic) | Wrote code and drafted summaries; software verified every quote. No AI on the live site |

## What could be piloted today (40 words)

Ready: item pages, source checking, decision route, address distance and print view, for three items. Not built: automatic intake of new items, a staff review screen, alerts. Next priority: other languages, and a phone or paper channel for offline residents.

## Adopting or scaling it

Adapting: only the page reader is Toronto-specific. A city on eSCRIBE or Legistar needs one adapter, its ward map and its address lookup. One adapter serves every municipality on that system, in any province.

Before a pilot: connect the city’s own meeting feed; have a clerk sign off each summary (about 10 to 15 minutes per item, our untested estimate); run an accessibility audit; add French and local languages.

Rough cost: hosting under $25 a month. The real cost is staff review time.

Privacy: no accounts, cookies or analytics. Residents’ names are never stored. A typed address goes only to the city’s own lookup.

Residents should know: the summary is a guide and the City record is the authority.

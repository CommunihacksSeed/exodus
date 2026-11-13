# Submission pack

Deadline: **Saturday, November 14, 2026, 10:00 a.m. ET** on Devpost.

## Devpost text

**Project name:** Clear Council

**Tagline:** City Hall decisions, in plain words, with the source beside every sentence.

**Short description** (problem, who it is for, solution, what is next):

> **The problem.** A council agenda item can run across three meetings and a 30-page staff report.
> A resident who wants to know "is this near me, has it been decided, can I still say something?"
> has to read planning language to find out, and most never do.
>
> **Who it is for.** Residents, especially renters and newcomers, who are affected by a decision
> but do not follow City Hall. Also the clerks and councillors' staff who are asked to explain
> these items.
>
> **What we built.** Clear Council turns one agenda item into one page: a four-line summary, a
> map with the distance from your address, a route that shows which body has decided what, and
> how to comment while you still can. Staff advice, committee recommendations and Council's
> decision are never blended. Every sentence shows the exact passage it rests on, and a program
> checks each quote word for word against the City's record before anything is published. If
> the City's page does not state a comment deadline, the page says so and does not guess one.
> It works today on three real City of Toronto items, with a print view for neighbours who are
> not online. The summaries were drafted with an AI model; the live site uses none.
>
> **What is next.** Automatic intake from a city's own meeting system, a review screen where a
> clerk signs off each summary, other languages, and a phone or paper channel. Only the page
> reader is specific to Toronto, so a city on eSCRIBE or Legistar needs one adapter.

**Built with:** TypeScript, React, Vite, MapLibre GL JS, OpenStreetMap (OpenFreeMap tiles), cheerio, pdf.js, Node.js,
City of Toronto Open Data, Claude (Anthropic).

## Checkpoint 1 (Friday, November 13, 8:00 a.m. ET, on Discord)

> **Problem and user:** A Toronto resident cannot tell from a council agenda what is proposed near
> them, who has decided it, or whether they can still comment.
> **Idea:** Clear Council turns one agenda item into one plain-language page with a map, a
> "who decided what" route and how to take part, where every sentence is checked against the
> City's own record before it is published.

## What is ready

- [x] Working app on three real items; `npm run data`, `npm test`, `npm run lint` and
      `npm run build` all pass
- [x] Design document with UML, rationale, scalability, AI disclosure and references
- [x] Readiness report text within every word limit, filled into the organizers' template
- [x] Video script, timed, with a recording checklist
- [x] Independent comparison of every sentence with its sources; wording corrected
- [x] Contrast, control names and heading order checked by script; print view inspected

## What only a team member can do

- [ ] **Sign off the three explanations.** Work through [REVIEW.md](REVIEW.md), then set
      `review.humanReviewedBy` and `review.reviewedOn` in each file under `data/explanations/`
      and run `npm run data`. Until then every page says no person has signed off.
- [ ] **Finish the readiness report.** Open `readiness-report/readiness-report-draft.docx` in
      Word or Google Docs, fill in team name, contact email and members, confirm the cost and
      review-time estimates, and save as PDF into `docs/readiness-report/`.
- [ ] **Record the video** from [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md). Keep it under 3:00.
- [ ] **Make the repository public** before submitting, so judges can open it.
- [ ] **Submit on Devpost:** repository link, video link, readiness report PDF, the text above.
- [ ] Post Checkpoint 1 on Discord.

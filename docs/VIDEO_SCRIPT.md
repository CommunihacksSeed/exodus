# Demo video script

**Target length: 2:40.** The hard limit is 3:00; anything longer is not judged.
Narration below is about 330 words: 2:12 of speech at 150 words per minute, which leaves about
25 seconds for pauses while the screen changes.

What the judges score (20 points): explains the problem, users and value; demonstrates the
core workflow and outputs; **distinguishes working features from plans**; clear audio and
visuals; storytelling. Each scene below is marked with the part it covers.

## Before recording

- [ ] `npm run data && npm run dev`, then open http://localhost:5173/
- [ ] Browser window about 1280 × 800, zoom 110%, bookmarks bar hidden, other tabs closed
- [ ] Clear any saved address: click **Clear address** on the home page if it shows
- [ ] Open in separate tabs, in this order:
  1. The staff report PDF: https://www.toronto.ca/legdocs/mmis/2027/pb/bgrd/backgroundfile-290746.pdf
  2. The City item page: https://secure.toronto.ca/council/agenda-item.do?item=2027.PB1.6
  3. Clear Council home: http://localhost:5173/
- [ ] A terminal in the `clear-council` folder, font size large, cleared
- [ ] A text editor with `data/explanations/2027.PB1.6.json` open at the first quote (line 20)
- [ ] Record the screen and your voice separately if you can; a clean voice track matters more
      than a perfect take of the clicks
- [ ] Demo address: **1303 Queen St W** (the public library branch on the same block, so no
      one's home address appears on screen)

## Script

| Time | On screen | Narration |
|---|---|---|
| **0:00–0:20** Problem | Tab 1: scroll the 17-page staff report quickly. Cut to tab 2, the City item page. | Next Monday, a Toronto board will consider a new sixteen-storey building in Parkdale. If you live on that block, this is what the City gives you: a seventeen-page report in planning language. Is it near me? Has it been decided? Can I still say something? Most residents never find out. |
| **0:20–0:32** Users and value | Tab 3: Clear Council home page. | Clear Council is for those residents, especially renters and newcomers, and for the clerks and councillors' staff who have to explain these items. One page per decision, in plain words. |
| **0:32–0:50** Core workflow: near me | Type `1303 Queen St W`, press **Check distance**. The top card now shows a distance. Click it. | I enter an address nearby. It goes only to the City's own address lookup. The item that is still open comes first, with how far away it is. |
| **0:50–1:12** Core workflow: status and participation | Item page. Pause on the route strip, then the four-line summary, then scroll to **Can I still have a say?** | This line is the heart of it. Staff have given advice. The board has not decided. Council has no date yet. Below it: yes, I can still comment, and here are the City's own forms. Notice the deadline. The City's page does not state one, so we say that, and we never guess one from the meeting date. |
| **1:12–1:32** Outputs: sources | Scroll to **What is being proposed?** Open **Where this comes from** on the first claim. Click **Open the original**; the City page opens with the passage highlighted. | Every sentence shows the exact passage it rests on, with the document, its date and a link to that spot in the City's record. |
| **1:32–1:52** Outputs: three kinds of decision | Back, open **Two 59-storey towers**. Show the route strip. Scroll to **Who has decided what so far?**, open **Motions and votes** under North York Community Council. | A decided item shows why the steps matter. Staff said approve. The community council voted it down, two to four. City Council then approved it with changes. A summary that blends those three would be wrong. |
| **1:52–2:15** How accuracy is enforced | Editor: change `16-storey` to `18-storey` in the first quote, save. Terminal: `npm run data`. The red failure message appears. Undo the edit, run again, it passes. | The summaries were drafted with an AI model, so we do not trust them. Before anything is published, a program checks every quote against the source, word for word. If I change one number, the build stops and nothing is published. |
| **2:15–2:35** Working versus planned, and other cities | Item page, click **Print this page** to show the paper view, then cut to the adapter diagram in `docs/DESIGN.md` on GitHub. | What works today: three real Toronto items, source checking, the decision route, distance from an address, and a print view for neighbours who are offline. Not built yet: automatic intake of new items, a review screen for staff, and other languages. Only the page reader is specific to Toronto, so another city needs one adapter. |
| **2:35–2:40** Close | Home page. | Clear Council. City Hall decisions, in plain words. |

## Notes for the take

- **Do not speed up the voice to fit.** If you run long, cut the print view from the 2:15 scene
  first, then shorten the 1:32 scene to the route strip only.
- The "next Monday" line is true for a video recorded this week: the Toronto Preservation Board
  meets on Monday, November 16, 2026.
- Say "drafted with an AI model" plainly. Disclosure is required by the rules and it sets up the
  strongest moment in the video.
- When the City page opens with the highlighted passage, hold for a full second so viewers can
  read it. If the highlight does not appear in your browser, scroll to the **Recommendations**
  heading by hand; the passage is the first numbered line.
- Keep the mouse still while you talk; move it only to point at what you are naming.
- After the failing build, remember to undo the edit before the second run. If it is easier,
  record this scene on its own and run `git checkout -- data/explanations/2027.PB1.6.json`
  afterwards.
- Add captions. They help the same people the tool is for, and judges watching without sound.

## If pull requests #1–#5 are merged before recording

The timings above still work. Swap in these shots without adding time:

- **0:20–0:32**: instead of a still home page, press **▶ Tour** and let the map fly to the first
  decision, with the storey-by-storey building visible. Switch to **Night** first if the room is
  dark; it reads better on video.
- **0:50–1:12**: point at **Listen to this page** and **Add the Monday, November 16 meeting to my
  calendar** while you say "here are the City's own forms". Do not play the audio over narration.
- **2:15–2:35**: add "and it works in French and Chinese" while switching the language menu, and
  show **How we check** for two seconds instead of the GitHub diagram.

## Five-minute live pitch (finalists only)

Use the same order with more room: 45 seconds on the problem and who is left out, 2 minutes of
live demo (address, route, have-a-say, sources, then the tour and the *How decisions are made* page), 45 seconds on the failing source check,
45 seconds on what a municipality needs before a pilot (first-party data feed, clerk sign-off,
accessibility audit, languages), 30 seconds on adapting to other cities. Expect questions on
how summaries are checked, what AI did, and cost; the answers are in `docs/DESIGN.md` sections
6, 7 and 10 and in the readiness report.

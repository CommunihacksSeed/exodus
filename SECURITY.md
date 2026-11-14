# Security

Clear Council is a static site: no server, no database, no accounts, no cookies, no analytics,
and no AI calls at run time.

## What the site contacts
- `tiles.openfreemap.org` for the map (no key, no account)
- `map.toronto.ca` for address lookup (the typed address goes here and nowhere else; no cookies, no referrer)

A Content-Security-Policy (in the built page and in `public/_headers`) allows nothing else.

## Trust boundaries
| Input | Check |
|---|---|
| City pages and PDFs | Parsed at build time; every quote must be found word for word or the build stops |
| Links in published data | `npm run data` refuses to publish a link that is not https to a City of Toronto host; the app checks again with `safeHref` |
| Geocoder reply | Timeout, status check, field and coordinate validation (`src/lib/geo.ts`) |
| `sessionStorage` | Shape-checked before use |

## Reporting a problem
Open a private security advisory on this repository, or contact a maintainer directly.
Please do not post details in a public issue.

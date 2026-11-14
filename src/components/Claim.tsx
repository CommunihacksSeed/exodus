import type { Claim, VerifiedCitation } from '../types.ts'
import { withTerms } from './Term.tsx'
import { safeHref } from '../lib/safe.ts'

/** One plain-language statement with its sources one tap away. */
export function ClaimItem({ claim, seen }: { claim: Claim<VerifiedCitation>; seen?: Set<string> }) {
  return (
    <li className="claim">
      <p className="claim-text">{withTerms(claim.text, seen)}</p>
      {claim.caveat && (
        <p className="claim-caveat">
          <span className="caveat-tag">Keep in mind</span> {claim.caveat}
        </p>
      )}
      <details className="sources">
        <summary>
          Where this comes from <span className="count">({claim.citations.length})</span>
        </summary>
        <ul>
          {claim.citations.map((c, i) => (
            <li key={i}>
              <blockquote>“{c.quote}”</blockquote>
              <p className="source-line">
                {c.sourceLabel}
                {c.page ? `, page ${c.page}` : ''} · {c.sourceDate} ·{' '}
                <a href={safeHref(c.url)} target="_blank" rel="noreferrer">
                  Open the original<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}

export function ClaimList({ claims }: { claims: Claim<VerifiedCitation>[] }) {
  // A glossary word is explained the first time it appears in a section, not every time.
  const seen = new Set<string>()
  return (
    <ul className="claims">
      {claims.map((c, i) => (
        <ClaimItem key={i} claim={c} seen={seen} />
      ))}
    </ul>
  )
}

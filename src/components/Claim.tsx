import type { Claim, VerifiedCitation } from '../types.ts'

/** One plain-language statement with its sources one tap away. */
export function ClaimItem({ claim }: { claim: Claim<VerifiedCitation> }) {
  return (
    <li className="claim">
      <p className="claim-text">{claim.text}</p>
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
                <a href={c.url} target="_blank" rel="noreferrer">
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
  return (
    <ul className="claims">
      {claims.map((c, i) => (
        <ClaimItem key={i} claim={c} />
      ))}
    </ul>
  )
}

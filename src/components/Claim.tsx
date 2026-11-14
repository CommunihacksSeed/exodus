import type { Claim, VerifiedCitation } from '../types.ts'
import { withTerms } from './Term.tsx'
import { safeHref } from '../lib/safe.ts'
import { useLang } from '../i18n/index.tsx'

/** One plain-language statement with its sources one tap away. */
export function ClaimItem({ claim, seen }: { claim: Claim<VerifiedCitation>; seen?: Set<string> }) {
  const { t } = useLang()
  return (
    <li className="claim">
      <p className="claim-text" lang="en">
        {withTerms(claim.text, seen)}
      </p>
      {claim.caveat && (
        <p className="claim-caveat">
          <span className="caveat-tag">{t('Keep in mind')}</span> <span lang="en">{claim.caveat}</span>
        </p>
      )}
      <details className="sources">
        <summary>
          {t('Where this comes from')} <span className="count">({claim.citations.length})</span>
        </summary>
        <ul>
          {claim.citations.map((c, i) => (
            <li key={i}>
              <blockquote lang="en">“{c.quote}”</blockquote>
              <p className="source-line">
                <span lang="en">{c.sourceLabel}</span>
                {c.page ? `, ${t('page {n}', { n: c.page })}` : ''} · <span lang="en">{c.sourceDate}</span> ·{' '}
                <a href={safeHref(c.url)} target="_blank" rel="noreferrer">
                  {t('Open the original')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
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

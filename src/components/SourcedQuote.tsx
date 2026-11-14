import { sourceById } from '../content/civics.ts'
import { safeHref } from '../lib/safe.ts'

/** A quoted passage with its source, date and a link to the original, styled like item-page sources. */
export function SourceLine({ quote, source }: { quote: string; source: string }) {
  const s = sourceById(source)
  return (
    <>
      <blockquote>“{quote}”</blockquote>
      <p className="source-line">
        {s.label} · {s.date} ·{' '}
        <a href={safeHref(s.url)} target="_blank" rel="noreferrer">
          Open the original<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </>
  )
}

/** A plain-language statement with its supporting quote one tap away (same pattern as item pages). */
export function SourcedQuote({ text, quote, source }: { text: string; quote: string; source: string }) {
  return (
    <li className="claim">
      <p className="claim-text">{text}</p>
      <details className="sources">
        <summary>
          Where this comes from <span className="count">(1)</span>
        </summary>
        <ul>
          <li>
            <SourceLine quote={quote} source={source} />
          </li>
        </ul>
      </details>
    </li>
  )
}

import { sourceById } from '../content/civics.ts'
import { safeHref } from '../lib/safe.ts'
import { useLang } from '../i18n/index.tsx'

/** A quoted passage with its source, date and a link to the original, styled like item-page sources. */
export function SourceLine({ quote, source }: { quote: string; source: string }) {
  const { t } = useLang()
  const s = sourceById(source)
  return (
    <>
      <blockquote lang="en">“{quote}”</blockquote>
      <p className="source-line">
        <span lang="en">{s.label}</span> · <span lang="en">{s.date}</span> ·{' '}
        <a href={safeHref(s.url)} target="_blank" rel="noreferrer">
          {t('Open the original')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
        </a>
      </p>
    </>
  )
}

/** A plain-language statement with its supporting quote one tap away (same pattern as item pages). */
export function SourcedQuote({ text, quote, source }: { text: string; quote: string; source: string }) {
  const { t } = useLang()
  return (
    <li className="claim">
      <p className="claim-text" lang="en">
        {text}
      </p>
      <details className="sources">
        <summary>
          {t('Where this comes from')} <span className="count">(1)</span>
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

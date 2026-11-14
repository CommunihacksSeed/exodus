import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GLOSSARY, PROCESS } from '../content/civics.ts'
import { formatCaptured, items } from '../lib/data.ts'
import { safeHref } from '../lib/safe.ts'
import type { Claim, VerifiedCitation } from '../types.ts'
import { fill, useLang } from '../i18n/index.tsx'

function allClaims(): { itemId: string; title: string; claim: Claim<VerifiedCitation> }[] {
  return items.flatMap(({ record, explanation: e }) =>
    e
      ? [...e.whatIsProposed, ...e.why, ...e.whoIsAffected, ...e.conditionsAndUnknowns, ...e.whatHappensNext, ...Object.values(e.stageSummaries)]
          .filter((c): c is Claim<VerifiedCitation> => Boolean(c))
          .map((claim) => ({ itemId: record.id, title: e.plainTitle, claim }))
      : [],
  )
}

const STEPS = [
  { title: 'Save the record', text: 'Each City item page and staff report is saved with its web address and the date it was captured.' },
  { title: 'Read it with rules', text: 'A program reads stages, dates, decisions, motions and votes. No AI is used for this.' },
  { title: 'Explain with quotes', text: 'Every plain-language sentence must quote the exact words it is based on.' },
  { title: 'Check every quote', text: 'The build looks for each quote, word for word, in its source. One miss and nothing is published.' },
  { title: 'A person signs off', text: 'A reviewer compares each sentence with its sources. Until then, the page says nobody has signed off.' },
]

const NEVER = [
  'Work out a deadline from a meeting date. A deadline is shown only if the City’s page states it.',
  'Mix up advice and decisions. Staff advice, committee votes and City Council’s decision are always shown apart.',
  'Hide a vote’s motion. Every vote is labelled with the motion it was on, which may be a change rather than the whole item.',
  'Store residents’ names. People who wrote or spoke to the City are counted, not named.',
  'Track you. No accounts, cookies or analytics. An address you type goes only to the City’s own address lookup.',
  'Call an AI model while you use the site. Nothing is generated on the fly.',
]

/** For judges, journalists and the curious: how a page gets made, with live numbers from the published data. */
export function HowWeCheck() {
  const { t } = useLang()
  const claims = useMemo(() => allClaims(), [])
  const [n, setN] = useState(0)
  const ex = claims[n % claims.length]

  const citations = claims.flatMap((c) => c.claim.citations)
  const verified = citations.filter((c) => c.verified).length
  const documents = new Set(citations.map((c) => c.sourceLabel)).size
  const civicQuotes = PROCESS.reduce((a, s) => a + s.facts.length, 0) + GLOSSARY.length
  const signedOff = items.filter((i) => i.explanation?.review.humanReviewedBy).length
  const explained = items.filter((i) => i.explanation).length
  const captured = [...new Set(items.map((i) => formatCaptured(i.record.retrievedAt)))].join(', ')

  return (
    <article className="page method">
      <title>{`${t('How we check')} — Clear Council`}</title>
      <p className="kicker">{t('Method')}</p>
      <h1>{t('How we check every sentence')}</h1>
      <p className="lede">
        {t('A summary that gets a decision wrong is worse than no summary. So nothing on this site is published unless the words it is based on can be found in the City’s own record.')}
      </p>

      <section aria-label={t('Numbers from the published data')} className="stats">
        <div><strong>{claims.length}</strong><span>{t('plain-language sentences')}</span></div>
        <div><strong>{verified}/{citations.length}</strong><span>{t('quotes found word for word')}</span></div>
        <div><strong>{documents}</strong><span>{t('City documents quoted')}</span></div>
        <div><strong>{civicQuotes}</strong><span>{t('checked quotes on the guide and glossary')}</span></div>
        <div><strong>{signedOff}/{explained}</strong><span>{t('items signed off by a person')}</span></div>
      </section>
      <p className="fine">{t('Counted from the data this page was built with. City records captured: {dates}.', { dates: captured })}</p>

      <section className="panel" aria-labelledby="steps-h">
        <h2 id="steps-h">{t('From City record to this site')}</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{t(s.title)}</h3>
                <p>{t(s.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {ex && (
        <section className="panel" aria-labelledby="try-h">
          <h2 id="try-h">{t('See one sentence beside its source')}</h2>
          <div className="compare">
            <div>
              <p className="compare-label">{t('What we wrote')}</p>
              <p className="compare-text">{ex.claim.text}</p>
              <p className="fine">
                {fill(t('From {link}'), { link: <Link to={`/item/${ex.itemId}`}>{ex.title}</Link> })}
              </p>
            </div>
            <div>
              <p className="compare-label">{t('What the City’s record says')}</p>
              {ex.claim.citations.map((c, i) => (
                <div key={i} className="compare-quote">
                  <blockquote>“{c.quote}”</blockquote>
                  <p className="source-line">
                    {c.sourceLabel}
                    {c.page ? `, page ${c.page}` : ''} · {c.sourceDate} ·{' '}
                    <a href={safeHref(c.url)} target="_blank" rel="noreferrer">
                      {t('Open the original')}<span className="sr-only"> {t('(opens in a new tab)')}</span>
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="button-secondary" onClick={() => setN((v) => v + 1)}>
            {t('Show another ({i} of {n})', { i: (n % claims.length) + 1, n: claims.length })}
          </button>
        </section>
      )}

      <section className="panel" aria-labelledby="never-h">
        <h2 id="never-h">{t('Things we never do')}</h2>
        <ul className="plain-list">
          {NEVER.map((line) => (
            <li key={line}>{t(line)}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="ai-h">
        <h2 id="ai-h">{t('Where AI was used')}</h2>
        <p>
          {t('The plain-language sentences were drafted with help from an AI model, and so was much of this site’s code. The steps, dates, votes and official wording come from rule-based code. Every quote is checked by a program, and each item page says whether a person has signed off.')}
        </p>
      </section>
    </article>
  )
}

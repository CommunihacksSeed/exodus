import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SourceLine } from '../components/SourcedQuote.tsx'
import { GLOSSARY, type Term } from '../content/civics.ts'
import { fill, translate, useLang } from '../i18n/index.tsx'

const GROUPS: Term['group'][] = ['People and meetings', 'Decisions and votes', 'Planning', 'Heritage']

/** The glossary: City Hall words in plain language, each shown in use in a real City document. */
export function Words() {
  const { t, lang } = useLang()
  const [q, setQ] = useState('')
  const { hash } = useLocation()

  // Arriving from a "More in Words" link: scroll to and open that word.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (!el) return
    el.scrollIntoView({ block: 'start' })
    el.focus({ preventScroll: true })
  }, [hash])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return GLOSSARY
    return GLOSSARY.filter((term) =>
      [term.term, term.meaning, translate(lang, term.meaning), ...(term.aliases ?? [])].some((s) => s.toLowerCase().includes(needle)),
    )
  }, [q, lang])

  return (
    <article className="page words">
      <title>{`${t('Words')} — Exodus`}</title>
      <p className="kicker">{t('Glossary')}</p>
      <h1>{t('City Hall words, in plain language')}</h1>
      <p className="lede">
        {t('The meanings are written in plain words by the Exodus team. Under each one is a passage from a City document where the word is used, so you can see it in context and check it.')}
      </p>

      <label className="words-search">
        <span>{t('Find a word')}</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('e.g. zoning, motion, heritage')} maxLength={60} />
      </label>
      <p className="sr-only" aria-live="polite">
        {t('{n} words shown.', { n: shown.length })}
      </p>

      {GROUPS.map((group) => {
        const terms = shown.filter((term) => term.group === group)
        if (terms.length === 0) return null
        return (
          <section key={group} className="words-group" aria-labelledby={`g-${group}`}>
            <h2 id={`g-${group}`}>{t(group)}</h2>
            <dl>
              {terms.map((term) => (
                <div key={term.id} id={term.id} tabIndex={-1} className="word" data-target={hash === `#${term.id}` || undefined}>
                  <dt lang="en">{term.term}</dt>
                  <dd>
                    <p>{t(term.meaning)}</p>
                    <details className="sources">
                      <summary>{t('Used in a City document')}</summary>
                      <SourceLine quote={term.inContext.quote} source={term.inContext.source} />
                    </details>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
      {shown.length === 0 && <p className="notice">{t('No word matches “{q}”. Try a shorter word.', { q })}</p>}
      <p className="fine">
        {fill(t('See how these fit together in {link}.'), { link: <Link to="/how-decisions-are-made">{t('How decisions are made')}</Link> })}
      </p>
    </article>
  )
}

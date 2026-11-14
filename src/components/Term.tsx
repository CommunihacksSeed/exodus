import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GLOSSARY, type Term as TermEntry } from '../content/civics.ts'
import { useLang } from '../i18n/index.tsx'

/** Longest first, so "Zoning By-law" wins over "By-law". */
const MATCHERS = GLOSSARY.flatMap((t) => [t.term, ...(t.aliases ?? [])].map((w) => ({ word: w.toLowerCase(), term: t }))).sort(
  (a, b) => b.word.length - a.word.length,
)
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PATTERN = new RegExp(`\\b(${MATCHERS.map((m) => escape(m.word)).join('|')})\\b`, 'gi')
const byWord = new Map(MATCHERS.map((m) => [m.word, m.term]))

/**
 * A word from the glossary. Tap, click or focus it to see its plain meaning without leaving the page.
 * The underlying text is never changed: the word is shown exactly as it was written.
 */
export function Term({ entry, children }: { entry: TermEntry; children: ReactNode }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      if (e.type === 'pointerdown' && ref.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [open])

  return (
    <span className="term" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term-word" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        {children}
      </button>
      {open && (
        <span className="term-pop" id={id} role="note">
          <strong className="term-pop-title">{entry.term}</strong>
          <span>{t(entry.meaning)}</span>
          <Link to={`/words#${entry.id}`} className="term-pop-link">
            {t('More in Words')}
          </Link>
        </span>
      )}
    </span>
  )
}

/**
 * Marks glossary words in a piece of text, the first time each appears.
 * `seen` lets several paragraphs share one set, so a word is explained once per section.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withTerms(text: string, seen: Set<string> = new Set()): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const entry = byWord.get(m[0].toLowerCase())
    if (!entry || seen.has(entry.id) || m.index === undefined) continue
    seen.add(entry.id)
    out.push(text.slice(last, m.index))
    out.push(
      <Term key={`${entry.id}-${m.index}`} entry={entry}>
        {m[0]}
      </Term>,
    )
    last = m.index + m[0].length
  }
  if (out.length === 0) return text
  out.push(text.slice(last))
  return out.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}

/**
 * Interface language. The interface (navigation, headings, buttons, labels) is translated.
 * Plain-language explanations and City records stay in English, because each sentence is checked
 * word for word against the City's English record; a translation could not be checked the same way.
 *
 * Keys are the English text itself, so a missing translation falls back to English rather than to a blank.
 */
import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from 'react'
import { fr } from './fr.ts'
import { zh } from './zh.ts'

export type Lang = 'en' | 'fr' | 'zh'
// eslint-disable-next-line react-refresh/only-export-components
export const LANGS: { id: Lang; label: string; short: string; htmlLang: string }[] = [
  { id: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { id: 'fr', label: 'Français', short: 'FR', htmlLang: 'fr-CA' },
  { id: 'zh', label: '中文', short: '中文', htmlLang: 'zh-Hans' },
]
const DICTS: Record<Exclude<Lang, 'en'>, Record<string, string>> = { fr, zh }
const KEY = 'clear-council:lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'fr' || saved === 'zh' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  return nav.startsWith('fr') ? 'fr' : nav.startsWith('zh') ? 'zh' : 'en'
}

/** Fills a translated template whose slots hold elements, e.g. a link inside a sentence. */
// eslint-disable-next-line react-refresh/only-export-components
export function fill(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((piece, i) => {
    const m = piece.match(/^\{(\w+)\}$/)
    return m && m[1] in parts ? <Fragment key={i}>{parts[m[1]]}</Fragment> : piece
  })
}

export type Translate = (text: string, vars?: Record<string, string | number>) => string

// eslint-disable-next-line react-refresh/only-export-components
export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  const base = lang === 'en' ? text : (DICTS[lang][text] ?? text)
  return vars ? base.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : base
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Translate }>({
  lang: 'en',
  setLang: () => {},
  t: (s, v) => translate('en', s, v),
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.id === lang)!.htmlLang
  }, [lang])
  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* not remembered: fine */
    }
  }
  return <LangContext.Provider value={{ lang, setLang, t: (s, v) => translate(lang, s, v) }}>{children}</LangContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLang = () => useContext(LangContext)

/** Language switch for the site header: three short choices, the current one highlighted. */
export function LangPicker() {
  const { lang, setLang, t } = useLang()
  const choose = (i: number) => {
    const next = LANGS[(i + LANGS.length) % LANGS.length]
    setLang(next.id)
    document.getElementById(`lang-${next.id}`)?.focus()
  }
  return (
    <div className="lang-switch" role="radiogroup" aria-label={t('Language')}>
      {LANGS.map((l, i) => (
        <button
          key={l.id}
          id={`lang-${l.id}`}
          type="button"
          role="radio"
          aria-checked={lang === l.id}
          tabIndex={lang === l.id ? 0 : -1}
          lang={l.htmlLang}
          aria-label={l.label}
          title={l.label}
          className={lang === l.id ? 'is-on' : ''}
          onClick={() => setLang(l.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); choose(i + 1) }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); choose(i - 1) }
          }}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}

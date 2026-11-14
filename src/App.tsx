import { useEffect, useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { LangPicker, LangProvider, useLang } from './i18n/index.tsx'
import { PlaceProvider } from './lib/place.tsx'
import { Home } from './pages/Home.tsx'
import { HowItWorks } from './pages/HowItWorks.tsx'
import { HowWeCheck } from './pages/HowWeCheck.tsx'
import { ItemPage } from './pages/ItemPage.tsx'
import { MyWard } from './pages/MyWard.tsx'
import { Words } from './pages/Words.tsx'

const NAV = [
  ['/', 'Map'],
  ['/my-ward', 'My ward'],
  ['/how-decisions-are-made', 'How decisions are made'],
  ['/words', 'Words'],
  ['/how-we-check', 'How we check'],
] as const

/** A new page starts at the top, as a full page load would. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, and an
    // effect must not return one.
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  )
}

/** Tells the reader when the connection drops, and what still works. */
function OfflineNote() {
  const { t } = useLang()
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <p className="offline-note" role="status">
      {t('You are offline. Pages you have opened still work; the map and the address lookup need a connection.')}
    </p>
  )
}

function Shell() {
  const { t } = useLang()
  return (
    <PlaceProvider>
      <HashRouter>
        <ScrollToTop />
        <a className="skip-link" href="#main">
          {t('Skip to content')}
        </a>
        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Exodus
          </Link>
          <span className="brand-note">{t('Independent prototype. Not a City of Toronto service.')}</span>
          <nav className="site-nav" aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                {t(label)}
              </NavLink>
            ))}
          </nav>
          <LangPicker />
        </header>
        <OfflineNote />
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/item/:id" element={<ItemPage />} />
            <Route path="/my-ward" element={<MyWard />} />
            <Route path="/how-decisions-are-made" element={<HowItWorks />} />
            <Route path="/words" element={<Words />} />
            <Route path="/how-we-check" element={<HowWeCheck />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <p>
            {t('Built for CIVIC Hack 2026. Data: City of Toronto council records and Open Data, under the Open Government Licence – Toronto. Map: © OpenStreetMap contributors, tiles by OpenFreeMap.')}
          </p>
        </footer>
      </HashRouter>
    </PlaceProvider>
  )
}

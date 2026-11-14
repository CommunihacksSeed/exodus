import { useEffect } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
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
    <PlaceProvider>
      <HashRouter>
        <ScrollToTop />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Clear Council
          </Link>
          <span className="brand-note">Independent prototype. Not a City of Toronto service.</span>
          <nav className="site-nav" aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
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
            Built for CIVIC Hack 2026. Data: City of Toronto council records and Open Data, under the Open Government
            Licence – Toronto. Map: © OpenStreetMap contributors, tiles by OpenFreeMap.
          </p>
        </footer>
      </HashRouter>
    </PlaceProvider>
  )
}

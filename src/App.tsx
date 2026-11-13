import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { PlaceProvider } from './lib/place.tsx'
import { Home } from './pages/Home.tsx'
import { ItemPage } from './pages/ItemPage.tsx'

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
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/item/:id" element={<ItemPage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <p>
            Built for CIVIC Hack 2026. Data: City of Toronto council records and Open Data, under the Open Government
            Licence – Toronto. Map: © OpenStreetMap contributors.
          </p>
        </footer>
      </HashRouter>
    </PlaceProvider>
  )
}

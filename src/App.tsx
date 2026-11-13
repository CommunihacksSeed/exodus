import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { PlaceProvider } from './lib/place.tsx'
import { Home } from './pages/Home.tsx'
import { ItemPage } from './pages/ItemPage.tsx'

export default function App() {
  return (
    <PlaceProvider>
      <HashRouter>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link to="/" className="brand">
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

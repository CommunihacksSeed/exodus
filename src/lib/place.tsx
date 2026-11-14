/**
 * The resident's chosen address. Kept in memory and in sessionStorage only,
 * so it disappears when the browser tab is closed. It is never sent to us.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { isPlaceMatch, type PlaceMatch } from './geo.ts'

const KEY = 'clear-council:place'

interface PlaceContextValue {
  place: PlaceMatch | null
  setPlace: (p: PlaceMatch | null) => void
}

const PlaceContext = createContext<PlaceContextValue>({ place: null, setPlace: () => {} })

function load(): PlaceMatch | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isPlaceMatch(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function PlaceProvider({ children }: { children: ReactNode }) {
  const [place, setState] = useState<PlaceMatch | null>(load)
  const setPlace = (p: PlaceMatch | null) => {
    setState(p)
    try {
      if (p) sessionStorage.setItem(KEY, JSON.stringify(p))
      else sessionStorage.removeItem(KEY)
    } catch {
      /* storage unavailable: the address simply lasts until the page reloads */
    }
  }
  return <PlaceContext.Provider value={{ place, setPlace }}>{children}</PlaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePlace = () => useContext(PlaceContext)

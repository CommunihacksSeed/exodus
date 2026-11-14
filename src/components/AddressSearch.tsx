import { useId, useState, type FormEvent } from 'react'
import { AddressLookupError, findAddress, type PlaceMatch } from '../lib/geo.ts'
import { usePlace } from '../lib/place.tsx'
import { useLang } from '../i18n/index.tsx'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; matches: PlaceMatch[] }
  | { kind: 'error'; message: string }

export function AddressSearch({ compact = false }: { compact?: boolean }) {
  const { t } = useLang()
  const { place, setPlace } = usePlace()
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const inputId = useId()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (query.trim().length < 3) return
    setState({ kind: 'loading' })
    try {
      const matches = await findAddress(query.trim())
      if (matches.length === 1) {
        setPlace(matches[0])
        setState({ kind: 'idle' })
      } else if (matches.length === 0) {
        setState({ kind: 'error', message: t('No Toronto address matched. Try a street number and name, like “100 Queen St W”.') })
      } else {
        setState({ kind: 'results', matches })
      }
    } catch (err) {
      const why = err instanceof AddressLookupError ? err.message : 'The City address lookup did not respond.'
      setState({ kind: 'error', message: `${why} ${t('You can still read everything below.')}` })
    }
  }

  if (place) {
    return (
      <div className="place-set" role="status">
        <p>
          {t('Showing distances from')} <strong>{place.label}</strong>
          {place.wardName ? ` (Ward ${place.wardNumber}, ${place.wardName})` : ''}.
        </p>
        <button type="button" className="link-button" onClick={() => setPlace(null)}>
          {t('Clear address')}
        </button>
      </div>
    )
  }

  return (
    <form className={`address-search${compact ? ' compact' : ''}`} onSubmit={onSubmit}>
      <label htmlFor={inputId}>{t('Your address or a nearby one (optional)')}</label>
      <div className="address-row">
        <input
          id={inputId}
          type="text"
          maxLength={120}
          autoComplete="street-address"
          placeholder={t('e.g. 100 Queen St W')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? t('Looking…') : t('Check distance')}
        </button>
      </div>
      <p className="privacy-note">
        {t('Your address is sent only to the City of Toronto’s address lookup. It stays in this browser tab and is forgotten when you close it.')}
      </p>
      <div aria-live="polite">
        {state.kind === 'error' && <p className="form-error">{state.message}</p>}
        {state.kind === 'results' && (
          <ul className="address-results">
            {state.matches.map((m) => (
              <li key={m.label}>
                <button
                  type="button"
                  onClick={() => {
                    setPlace(m)
                    setState({ kind: 'idle' })
                  }}
                >
                  {m.label}
                  {m.wardName ? ` — ${m.wardName}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  )
}

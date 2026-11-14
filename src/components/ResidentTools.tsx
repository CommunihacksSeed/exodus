import { useEffect, useMemo, useRef, useState } from 'react'
import { meetingsToIcs, upcomingMeetings } from '../lib/calendar.ts'
import { speechSegments } from '../lib/speech.ts'
import { rankVoices, voiceLabel } from '../lib/voices.ts'
import type { PublishedItem } from '../types.ts'

const RATES = [
  { value: 0.85, label: 'Slower' },
  { value: 1, label: 'Normal' },
  { value: 1.2, label: 'Faster' },
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The element to highlight while a section is read: the panel around a heading, or the page header. */
function sectionFor(id: string): HTMLElement | null {
  if (id === 'top') return document.querySelector('.item-header')
  return document.getElementById(id)?.closest('section') ?? null
}

const VOICE_KEY = 'clear-council:voice'

/** The device's voices, best first. Voices load asynchronously, so this updates when they arrive. */
function useVoices(enabled: boolean): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    if (!enabled) return
    const update = () => setVoices(rankVoices(window.speechSynthesis.getVoices()))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [enabled])
  return voices
}

function savedVoice(): string {
  try {
    return localStorage.getItem(VOICE_KEY) ?? ''
  } catch {
    return ''
  }
}

function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Tools a resident can use on an item page: listen to it, put an upcoming meeting in their calendar,
 * share it, print it. Everything runs in the browser. Reading aloud uses a voice on the device unless
 * the resident picks one marked "online".
 */
export function ResidentTools({ item }: { item: PublishedItem }) {
  const title = item.explanation?.plainTitle ?? item.record.title
  const segments = useMemo(() => speechSegments(item), [item])
  const meetings = useMemo(() => upcomingMeetings(item.record), [item])

  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [rate, setRate] = useState(1)
  const voices = useVoices(canSpeak)
  const [voiceURI, setVoiceURI] = useState(savedVoice)
  // The chosen voice if it is still installed, otherwise the best one available.
  const voice = voices.find((v) => v.voiceURI === voiceURI) ?? voices[0] ?? null
  // Read by the utterance callbacks, which outlive the render that created them.
  const rateRef = useRef(rate)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(voice)
  rateRef.current = rate
  voiceRef.current = voice
  const [shareNote, setShareNote] = useState('')
  const indexRef = useRef(0)
  const runRef = useRef(0)

  const clearHighlight = () => document.querySelectorAll('.is-reading').forEach((el) => el.classList.remove('is-reading'))

  function stop() {
    runRef.current++
    if (canSpeak) window.speechSynthesis.cancel()
    clearHighlight()
    setSpeaking('idle')
  }

  function speakFrom(index: number, run: number) {
    if (run !== runRef.current) return
    if (index >= segments.length) {
      clearHighlight()
      setSpeaking('idle')
      return
    }
    indexRef.current = index
    const seg = segments[index]
    const el = sectionFor(seg.sectionId)
    if (el && !el.classList.contains('is-reading')) {
      clearHighlight()
      el.classList.add('is-reading')
      el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
    }
    const u = new SpeechSynthesisUtterance(seg.text)
    const v = voiceRef.current
    if (v) {
      u.voice = v
      u.lang = v.lang
    } else {
      u.lang = 'en-CA'
    }
    u.rate = rateRef.current
    u.onend = () => speakFrom(index + 1, run)
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') speakFrom(index + 1, run)
    }
    window.speechSynthesis.speak(u)
  }

  function play() {
    if (speaking === 'paused') {
      window.speechSynthesis.resume()
      setSpeaking('playing')
      return
    }
    window.speechSynthesis.cancel()
    const run = ++runRef.current
    setSpeaking('playing')
    speakFrom(0, run)
  }

  /** After a voice or speed change, say the current sentence again with the new setting. */
  function restartSentence() {
    if (speaking !== 'playing') return
    window.speechSynthesis.cancel()
    const run = ++runRef.current
    const at = indexRef.current
    setTimeout(() => speakFrom(at, run), 0)
  }

  function pause() {
    window.speechSynthesis.pause()
    setSpeaking('paused')
  }

  // Stop reading when the resident leaves the page.
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  function downloadCalendar() {
    const ics = meetingsToIcs(item.record, title, meetings)
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `clear-council-${item.record.id}.ics`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} — Clear Council`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareNote('Link copied.')
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return
      setShareNote('Could not copy. The address in your browser bar is the link to this page.')
    }
    setTimeout(() => setShareNote(''), 4000)
  }

  return (
    <div className="tools no-print" role="group" aria-label="Tools for this page">
      {canSpeak && (
        <div className="tool tool-listen">
          {speaking === 'playing' ? (
            <button type="button" onClick={pause} aria-label="Pause reading">
              <span aria-hidden="true" className="tool-icon">❚❚</span> Pause
            </button>
          ) : (
            <button type="button" onClick={play}>
              <span aria-hidden="true" className="tool-icon">▶</span> {speaking === 'paused' ? 'Resume' : 'Listen to this page'}
            </button>
          )}
          {speaking !== 'idle' && (
            <button type="button" className="button-secondary" onClick={stop}>
              Stop
            </button>
          )}
          {voices.length > 1 && (
            <label className="tool-select">
              <span className="tool-select-label">Voice</span>
              <select
                value={voice?.voiceURI ?? ''}
                onChange={(e) => {
                  const chosen = voices.find((v) => v.voiceURI === e.target.value) ?? null
                  setVoiceURI(e.target.value)
                  voiceRef.current = chosen
                  try {
                    localStorage.setItem(VOICE_KEY, e.target.value)
                  } catch {
                    /* not remembered: fine */
                  }
                  restartSentence()
                }}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {voiceLabel(v)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="tool-select">
            <span className="tool-select-label">Speed</span>
            <select
              value={rate}
              onChange={(e) => {
                const r = Number(e.target.value)
                setRate(r)
                rateRef.current = r
                restartSentence()
              }}
            >
              {RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <span className="sr-only" aria-live="polite">
            {speaking === 'playing' ? 'Reading the page aloud.' : speaking === 'paused' ? 'Paused.' : ''}
          </span>
        </div>
      )}

      <div className="tool">
        <button type="button" className="button-secondary" onClick={share}>
          <span aria-hidden="true" className="tool-icon">↗</span> Share
        </button>
        <button type="button" className="button-secondary" onClick={() => window.print()}>
          <span aria-hidden="true" className="tool-icon">⎙</span> Print
        </button>
        <span role="status" className="tool-note">{shareNote}</span>
      </div>
      {meetings.length > 0 && (
        <div className="tool tool-cal">
          <button type="button" className="button-secondary" onClick={downloadCalendar}>
            <span aria-hidden="true" className="tool-icon">＋</span> Add {meetings.length === 1 ? `the ${formatDay(meetings[0].date)} meeting` : `${meetings.length} meeting days`} to my calendar
          </button>
          <span className="tool-note">A meeting date from the City record, not a deadline to comment.</span>
        </div>
      )}

    </div>
  )
}

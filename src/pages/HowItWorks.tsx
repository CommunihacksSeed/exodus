import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SourcedQuote } from '../components/SourcedQuote.tsx'
import { withTerms } from '../components/Term.tsx'
import { PROCESS, type ProcessStop } from '../content/civics.ts'
import { items } from '../lib/data.ts'
import { buildStages, currentIndex, itemStatus, STATUS_WORDS } from '../lib/stages.ts'

/** Which real items in Clear Council are at each stop right now (from the record only). */
function itemsAt(stop: ProcessStop['id']) {
  return items.filter(({ record }) => {
    if (stop === 'after') return itemStatus(record) === 'decided'
    if (itemStatus(record) === 'decided') return false
    const stages = buildStages(record)
    return stages[currentIndex(stages)].kind === stop
  })
}

/**
 * "How decisions are made": the path every item takes, drawn as the same route used on item pages.
 * Choose a stop to see what happens there, what you can do, and which real items are there now.
 */
export function HowItWorks() {
  const [chosen, setChosen] = useState<ProcessStop['id']>('committee')
  const stop = PROCESS.find((s) => s.id === chosen)!
  const here = itemsAt(chosen)
  const seen = new Set<string>()

  return (
    <article className="page explainer">
      <title>How decisions are made — Clear Council</title>
      <p className="kicker">Guide</p>
      <h1>How City Hall makes a decision</h1>
      <p className="lede">
        Most proposals travel the same route. Choose a stop to see what happens there and when you can have a say.
      </p>

      <ol className="route route-guide" role="tablist" aria-label="Steps of a decision">
        {PROCESS.map((s, i) => (
          <li key={s.id} className={`stop ${s.id === chosen ? 'stop-decided' : 'stop-advice'}`} role="presentation">
            <button
              type="button"
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={s.id === chosen}
              aria-controls="stop-panel"
              className="guide-stop"
              onClick={() => setChosen(s.id)}
              onKeyDown={(e) => {
                const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
                if (!dir) return
                const next = PROCESS[(i + dir + PROCESS.length) % PROCESS.length]
                setChosen(next.id)
                document.getElementById(`tab-${next.id}`)?.focus()
              }}
            >
              <span className="stop-dot" aria-hidden="true" />
              <span className="stop-who">{s.title}</span>
              <span className="stop-date">Step {i + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      <section id="stop-panel" role="tabpanel" aria-labelledby={`tab-${stop.id}`} className="panel guide-panel" key={stop.id}>
        <h2>{stop.title}</h2>
        <p className="guide-who">
          <span className="caveat-tag">Who</span> {withTerms(stop.who, seen)}
        </p>
        <ul className="claims">
          {stop.facts.map((f) => (
            <SourcedQuote key={f.quote} {...f} />
          ))}
        </ul>
        <div className="guide-you">
          <h3>What you can do here</h3>
          <p>{withTerms(stop.youCan, seen)}</p>
        </div>
        <div className="guide-now">
          <h3>At this stop in Clear Council right now</h3>
          {here.length > 0 ? (
            <ul className="guide-items">
              {here.map(({ record, explanation }) => (
                <li key={record.id}>
                  <Link to={`/item/${record.id}`}>{explanation?.plainTitle ?? record.title}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine">None of the items in this prototype are at this stop right now.</p>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="outcomes-h">
        <h2 id="outcomes-h">Words you will see after a vote</h2>
        <p className="section-intro">The City record uses short status words. This is what they mean in plain language.</p>
        <dl className="outcomes">
          {Object.entries(STATUS_WORDS).map(([word, plain]) => (
            <div key={word}>
              <dt>{word}</dt>
              <dd>{plain}</dd>
            </div>
          ))}
        </dl>
        <p className="fine">
          More words are explained in <Link to="/words">Words</Link>.
        </p>
      </section>
    </article>
  )
}

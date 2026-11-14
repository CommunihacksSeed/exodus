/**
 * Choosing a pleasant voice for "Listen to this page".
 *
 * Browsers expose whatever voices the operating system has, including novelty voices
 * (macOS ships "Zarvox", "Bubbles", "Bad News"...). Those are never offered. Among the rest,
 * high-quality voices are preferred, and voices that run on the device are preferred over
 * online ones so the page text stays on the device unless the resident picks an online voice.
 */

/** The subset of SpeechSynthesisVoice used here, so the ranking can be tested without a browser. */
export interface VoiceLike {
  name: string
  lang: string
  voiceURI: string
  localService: boolean
}

const NOVELTY = new Set(
  [
    'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Deranged', 'Good News', 'Hysterical',
    'Jester', 'Junior', 'Organ', 'Pipe Organ', 'Ralph', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
    'Fred', 'Kathy', 'Princess', 'Agnes', 'Bruce', 'Vicki', 'Victoria',
    'Grandma', 'Grandpa', 'Rocko', 'Eddy', 'Reed', 'Sandy', 'Shelley', 'Flo',
  ].map((n) => n.toLowerCase()),
)

/** First word of the name, without the "(English (US))" style suffix some systems add. */
const baseName = (name: string) => name.replace(/\s*\(.*$/, '').trim().toLowerCase()

/** Natural-sounding voices known on common systems (macOS, iOS, Windows, Android, Chrome, Edge). */
const KNOWN_GOOD = [
  'ava', 'allison', 'samantha', 'susan', 'zoe', 'evan', 'nathan', 'tom', 'joelle', 'noelle', 'nicky',
  'daniel', 'kate', 'serena', 'oliver', 'karen', 'lee', 'moira', 'tessa', 'catherine', 'gordon',
  'aria', 'jenny', 'guy', 'clara', 'liam', 'libby', 'ryan', 'sonia', 'natasha', 'william',
  'google us english', 'google uk english female', 'google uk english male',
]

export function isNovelty(v: VoiceLike): boolean {
  return NOVELTY.has(baseName(v.name))
}

/** Higher is better. Novelty voices and non-English voices are excluded before this is used. */
export function voiceScore(v: VoiceLike): number {
  const name = v.name.toLowerCase()
  let score = 0
  if (/premium|enhanced|neural|natural|siri/.test(name)) score += 60
  const known = KNOWN_GOOD.findIndex((k) => name === k || name.startsWith(`${k} `) || name.includes(`microsoft ${k}`))
  if (known >= 0) score += 40 - known * 0.1
  if (v.lang === 'en-CA') score += 15
  else if (v.lang === 'en-US') score += 10
  else if (v.lang === 'en-GB') score += 8
  else if (v.lang.startsWith('en')) score += 5
  if (v.localService) score += 100 // on-device voices always win by default, so the text stays on the device
  if (/compact|espeak/.test(name)) score -= 50
  return score
}

/** English voices worth offering, best first. */
export function rankVoices<V extends VoiceLike>(voices: V[]): V[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('en') && !isNovelty(v))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
}

/** Short label for the voice menu, e.g. "Samantha (US)" or "Aria (US, online)". */
export function voiceLabel(v: VoiceLike): string {
  const region = v.lang.split(/[-_]/)[1]?.toUpperCase() ?? ''
  const name = v.name.replace(/\s*\(.*$/, '').replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, '')
  return `${name} (${[region, v.localService ? '' : 'online'].filter(Boolean).join(', ')})`
}

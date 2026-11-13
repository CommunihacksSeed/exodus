import itemsJson from '../generated/items.json'
import wardsJson from '../generated/wards.json'
import type { PublishedItem } from '../types.ts'
import type { LatLng } from './geo.ts'

export const items = itemsJson as unknown as PublishedItem[]

export interface WardShape {
  number: number
  name: string
  polygons: LatLng[][]
}
export const wards = wardsJson as unknown as WardShape[]

export const findItem = (id: string) => items.find((i) => i.record.id === id)

/** "2026-11-13T02:35:39.492Z" -> "November 12, 2026" in Toronto time. */
export function formatCaptured(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Drive mode: a toy car on the 3D map. Pure functions only (no map library), so the
 * physics can be tested. The car drives freely; it does not follow roads.
 */
import { nearestDistance, type LatLng } from './geo.ts'

export interface Car {
  lat: number
  lng: number
  /** Degrees clockwise from north, like a map bearing. */
  heading: number
  /** Metres per second; negative when reversing. */
  speed: number
}

export interface DriveInput {
  /** 1 accelerate, -1 brake / reverse, 0 coast. */
  throttle: -1 | 0 | 1
  /** -1 left, 1 right. */
  steer: -1 | 0 | 1
  boost: boolean
}

/** Game speeds, not road speeds: the city is big and a real 50 km/h would feel frozen. */
export const DRIVE = {
  maxSpeed: 55,
  boostSpeed: 110,
  maxReverse: 14,
  accel: 38,
  brake: 70,
  friction: 22,
  /** Degrees per second at full lock, scaled down at low speed. */
  turnRate: 95,
  /** How much bigger than a real car the toy is drawn, so it reads at street zoom. */
  scale: 5,
}

const M_PER_DEG_LAT = 111320
const rad = (d: number) => (d * Math.PI) / 180

/** Advance the car by dt seconds. */
export function step(car: Car, input: DriveInput, dt: number): Car {
  const top = input.boost ? DRIVE.boostSpeed : DRIVE.maxSpeed
  let speed = car.speed
  if (input.throttle === 1) speed = speed < 0 ? speed + DRIVE.brake * dt : Math.min(top, speed + DRIVE.accel * (input.boost ? 1.8 : 1) * dt)
  else if (input.throttle === -1) speed = speed > 0 ? speed - DRIVE.brake * dt : Math.max(-DRIVE.maxReverse, speed - DRIVE.accel * 0.6 * dt)
  else {
    const drop = DRIVE.friction * dt
    speed = Math.abs(speed) <= drop ? 0 : speed - Math.sign(speed) * drop
  }
  if (speed > top) speed = Math.max(top, speed - DRIVE.brake * dt) // easing off the boost

  // Steering needs movement, and reverses when reversing, like a real car.
  const grip = Math.min(1, Math.abs(speed) / 10)
  const heading = (((car.heading + input.steer * DRIVE.turnRate * grip * Math.sign(speed || 1) * dt) % 360) + 360) % 360

  const dist = speed * dt
  const north = Math.cos(rad(heading)) * dist
  const east = Math.sin(rad(heading)) * dist
  return {
    lat: car.lat + north / M_PER_DEG_LAT,
    lng: car.lng + east / (M_PER_DEG_LAT * Math.cos(rad(car.lat))),
    heading,
    speed,
  }
}

/** Speed for the dashboard, in km/h (game scale). */
export const kmh = (speed: number) => Math.round(Math.abs(speed) * 3.6)

/** A rectangle around the car, `forward`/`back`/`half` in metres, as a closed [lng, lat] ring. */
function box(car: Car, forward: number, back: number, half: number): [number, number][] {
  const s = DRIVE.scale
  const corners: [number, number][] = [
    [forward * s, -half * s],
    [forward * s, half * s],
    [-back * s, half * s],
    [-back * s, -half * s],
    [forward * s, -half * s],
  ]
  const h = rad(car.heading)
  return corners.map(([f, r]) => {
    const north = f * Math.cos(h) - r * Math.sin(h)
    const east = f * Math.sin(h) + r * Math.cos(h)
    return [car.lng + east / (M_PER_DEG_LAT * Math.cos(rad(car.lat))), car.lat + north / M_PER_DEG_LAT]
  })
}

/** The car as 3D blocks for a fill-extrusion layer: body, cabin and two headlights. */
export function carFeatures(car: Car) {
  const s = DRIVE.scale
  const part = (ring: [number, number][], base: number, top: number, kind: string) => ({
    type: 'Feature' as const,
    properties: { base: base * s, top: top * s, kind },
    geometry: { type: 'Polygon' as const, coordinates: [ring] },
  })
  return {
    type: 'FeatureCollection' as const,
    features: [
      part(box(car, 2.3, 2.3, 0.95), 0.25, 1.05, 'body'),
      part(box(car, 0.7, 1.5, 0.8), 1.05, 1.65, 'cabin'),
      part(box(car, 2.35, -2.05, 0.85), 0.55, 0.85, 'light'),
    ],
  }
}

export interface Site {
  id: string
  label: string
  points: LatLng[]
}

/** The decision the car is at (within `radius` metres), if any. */
export function siteAt(car: Car, sites: Site[], radius = 80): Site | null {
  let best: Site | null = null
  let bestD = radius
  for (const s of sites) {
    const d = nearestDistance([car.lat, car.lng], s.points)
    if (d <= bestD) {
      best = s
      bestD = d
    }
  }
  return best
}

/** Toronto City Hall, where a drive starts when no decision is chosen. */
export const CITY_HALL: LatLng = [43.65344, -79.38409]

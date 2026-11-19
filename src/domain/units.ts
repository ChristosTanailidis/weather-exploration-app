import type { UnitSystem } from '@/domain/types'

export type TempUnit = 'celsius' | 'fahrenheit'
export type SpeedUnit = 'kmh' | 'mph'
export type PrecipUnit = 'mm' | 'in'

export interface UnitSet {
  temp: TempUnit
  speed: SpeedUnit
  precip: PrecipUnit
}

export const UNIT_SETS: Readonly<Record<UnitSystem, UnitSet>> = {
  metric: { temp: 'celsius', speed: 'kmh', precip: 'mm' },
  imperial: { temp: 'fahrenheit', speed: 'mph', precip: 'in' },
}

const KM_PER_MILE = 1.609344
const MM_PER_INCH = 25.4
const FAHRENHEIT_SCALE = 9 / 5
const FAHRENHEIT_OFFSET = 32

/** Decimal places shown per unit. */
export const DISPLAY_DECIMALS: Readonly<Record<TempUnit | SpeedUnit | PrecipUnit, number>> = {
  celsius: 0,
  fahrenheit: 0,
  kmh: 0,
  mph: 0,
  mm: 1,
  in: 2,
}

/** Converts degrees Celsius to Fahrenheit. */
export const celsiusToFahrenheit = (tempC: number): number => tempC * FAHRENHEIT_SCALE + FAHRENHEIT_OFFSET

/** Converts kilometres per hour to miles per hour. */
export const kmhToMph = (speedKmh: number): number => speedKmh / KM_PER_MILE

/** Converts millimetres to inches. */
export const mmToInches = (lengthMm: number): number => lengthMm / MM_PER_INCH

/** Rounds to `decimals` places and never returns negative zero. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return rounded === 0 ? 0 : rounded
}

function display(value: number | null | undefined, convert: (v: number) => number, decimals: number): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null
  }
  return roundTo(convert(value), decimals)
}

const identity = (value: number): number => value

/** A Celsius value in the given system, rounded for display; `null` if missing. */
export function displayTemp(tempC: number | null | undefined, system: UnitSystem): number | null {
  const unit = UNIT_SETS[system].temp
  return display(tempC, unit === 'fahrenheit' ? celsiusToFahrenheit : identity, DISPLAY_DECIMALS[unit])
}

/** A km/h value in the given system, rounded for display; `null` if missing. */
export function displaySpeed(speedKmh: number | null | undefined, system: UnitSystem): number | null {
  const unit = UNIT_SETS[system].speed
  return display(speedKmh, unit === 'mph' ? kmhToMph : identity, DISPLAY_DECIMALS[unit])
}

/** A millimetre value in the given system, rounded for display; `null` if missing. */
export function displayPrecip(precipMm: number | null | undefined, system: UnitSystem): number | null {
  const unit = UNIT_SETS[system].precip
  return display(precipMm, unit === 'in' ? mmToInches : identity, DISPLAY_DECIMALS[unit])
}

/** Default unit system for a BCP 47 locale: imperial for the US, Liberia and Myanmar. */
export function defaultUnitSystem(locale: string | undefined): UnitSystem {
  const region = locale?.split(/[-_]/)[1]?.toUpperCase()
  return region === 'US' || region === 'LR' || region === 'MM' ? 'imperial' : 'metric'
}

/** Stroke icons from the design (24 × 24 grid); circles are written as arc paths. */
const circle = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

const DROPLET = 'M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8z'

export const ICON_PATHS = {
  search: [circle(11, 11, 7), 'M16.5 16.5L21 21'],
  location: ['M3 11l18-8-8 18-2-8-8-2z'],
  star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  globe: [circle(12, 12, 9), 'M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12M18 6L6 18'],
  back: ['M19 12H5M11 6l-6 6 6 6'],
  grip: ['M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  more: [circle(5, 12, 1.3), circle(12, 12, 1.3), circle(19, 12, 1.3)],
  info: [circle(12, 12, 9), 'M12 11v5M12 8h.01'],
  compare: ['M4 19V9M10 19V5M16 19v-7M22 19H2'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7'],
  temperature: ['M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z'],
  precipitation: [DROPLET],
  wind: ['M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7'],
  clouds: ['M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 11.2 3.6 3.6 0 0 0 7 18.5z'],
  warning: ['M12 3.5l9.5 16.5h-19z', 'M12 10v4.5M12 17.2h.01'],
  offline: ['M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14.5 10.4A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4.5-2.8M10.5 5.1A15 15 0 0 1 22 9.5M12 20h.01'],
  locationOff: ['M3 3l18 18M9.5 5.2A7 7 0 0 1 19 11c0 2.2-1 4.3-2.3 6.1M14.6 18.9C13.4 20.3 12 21.3 12 21.3S5 15.6 5 11c0-1.3.3-2.4.9-3.4'],
  clock: [circle(12, 12, 9), 'M12 7v5l3 2'],
  external: ['M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  humidity: [DROPLET, 'M9.5 15.5l5-5M9.7 11h.01M14.3 15.2h.01'],
  umbrella: ['M12 4a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 13v5.5a2 2 0 0 0 4 0'],
  sunrise: ['M3 19h18M6.5 15.5a5.5 5.5 0 0 1 11 0M12 3.5V9M9 6.5l3-3 3 3'],
  sunset: ['M3 19h18M6.5 15.5a5.5 5.5 0 0 1 11 0M12 3.5V9M9 6l3 3 3-3'],
  chevronRight: ['M9 6l6 6-6 6'],
} as const satisfies Record<string, readonly string[]>

export type IconName = keyof typeof ICON_PATHS

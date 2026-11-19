/** Ids of the map layers the app adds, shared between layer components. */
export const CITY_LAYER_IDS = {
  normal: 'city-weather',
  saved: 'city-weather-saved',
  selected: 'city-weather-selected',
} as const

export const SELECTED_POINT_LAYER_IDS = {
  ring: 'selected-point-ring',
  dot: 'selected-point-dot',
} as const

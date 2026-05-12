// OSRM Demo Server (free, no API key needed)
const OSRM_BASE = 'https://router.project-osrm.org'

const PROFILE_MAP = {
  'driving-car': 'driving',
  'foot-walking': 'foot',
}

function coordStr(lat, lng) { return `${lng},${lat}` }

/**
 * Get a duration matrix (seconds) between all points using OSRM table service
 * Returns NxN matrix of durations
 */
export async function getDurationMatrix(points, mode = 'driving-car') {
  const profile = PROFILE_MAP[mode] || 'driving'
  const coords = points.map(p => coordStr(p.lat, p.lng)).join(';')
  const url = `${OSRM_BASE}/table/v1/${profile}/${coords}?annotations=duration,distance`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener matriz de tiempos')
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error('OSRM error: ' + data.message)

  return {
    durations: data.durations,   // seconds
    distances: data.distances,   // meters
  }
}

/**
 * Get the actual road geometry for a sequence of waypoints
 */
export async function getRoute(points, mode = 'driving-car') {
  const profile = PROFILE_MAP[mode] || 'driving'
  const coords = points.map(p => coordStr(p.lat, p.lng)).join(';')
  const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al calcular ruta')
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error('OSRM route error')

  const route = data.routes[0]
  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // Leaflet format
    totalDuration: route.duration,    // seconds
    totalDistance: route.distance,    // meters
    legs: route.legs.map(leg => ({
      duration: leg.duration,
      distance: leg.distance,
    })),
  }
}

export function formatDuration(seconds) {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

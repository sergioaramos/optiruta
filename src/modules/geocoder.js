import { getCachedCoords, setCachedCoords } from './storage.js'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const DELAY = 1100 // 1.1s between requests (Nominatim rate limit: 1/s)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function geocodeAddress(address, onProgress) {
  const cached = getCachedCoords(address)
  if (cached) return cached

  const params = new URLSearchParams({
    q: `${address}, Manizales, Caldas, Colombia`,
    format: 'json',
    limit: 1,
    countrycodes: 'co',
  })

  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'OptiRuta/1.0' }
  })
  const data = await res.json()
  if (!data.length) throw new Error(`No se encontró: "${address}"`)

  const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
  setCachedCoords(address, coords)
  return coords
}

export async function geocodeAll(addresses, onProgress) {
  const results = []
  for (let i = 0; i < addresses.length; i++) {
    try {
      const coords = await geocodeAddress(addresses[i])
      results.push({ address: addresses[i], ...coords, error: null })
    } catch (err) {
      results.push({ address: addresses[i], lat: null, lng: null, error: err.message })
    }
    onProgress && onProgress(i + 1, addresses.length)
    if (i < addresses.length - 1) await sleep(DELAY)
  }
  return results
}

export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalización no disponible'))
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => reject(new Error('No se pudo obtener la ubicación. Activa el GPS.')),
      { timeout: 10000, maximumAge: 60000 }
    )
  })
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({ lat, lon: lng, format: 'json' })
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'OptiRuta/1.0' }
  })
  const data = await res.json()
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

import { getCachedCoords, setCachedCoords } from './storage.js'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const DELAY = 1100

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Normaliza el formato de dirección colombiano para mejorar resultados en Nominatim.
 * Ej: "CALLE 72 # 27 - 114 EDIFICIO SAN FRANCISCO APTO 101"
 *  → ["Calle 72 27-114, Manizales, Caldas, Colombia",
 *     "Calle 72, Manizales, Caldas, Colombia"]
 */
function buildQueries(address) {
  const a = address
    .replace(/edificio\s+\S+/gi, '')
    .replace(/\bapto\.?\s*\d+/gi, '')
    .replace(/\bap\.?\s*\d+/gi, '')
    .replace(/\boficina\s*\d+/gi, '')
    .replace(/\bpiso\s*\d+/gi, '')
    .replace(/\bint\.?\s*\d+/gi, '')
    .replace(/\bbloque\s*\S+/gi, '')
    .replace(/\b(cll|cl)\b/gi, 'Calle')
    .replace(/\b(cra|cr|kra|kr)\b/gi, 'Carrera')
    .replace(/\b(av|avda)\b/gi, 'Avenida')
    .replace(/\b(dg|diag)\b/gi, 'Diagonal')
    .replace(/\b(tv|transv)\b/gi, 'Transversal')
    .replace(/#/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const suffix = ', Manizales, Caldas, Colombia'

  // Intento 1: dirección completa normalizada
  const q1 = `${a}${suffix}`

  // Intento 2: solo calle/carrera + número principal (quita el complemento tras el guión)
  const q2 = a.replace(/\s*-\s*\d+\s*$/, '').trim() + suffix

  // Intento 3: solo la vía principal sin número
  const viaMatch = a.match(/^(Calle|Carrera|Avenida|Diagonal|Transversal)\s+[\d\w]+/i)
  const q3 = viaMatch ? viaMatch[0] + suffix : null

  return [q1, q2, q3].filter(Boolean)
}

async function tryNominatim(query) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: 1, countrycodes: 'co' })
  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'OptiRuta/1.0' }
  })
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
}

export async function geocodeAddress(address) {
  const cached = getCachedCoords(address)
  if (cached) return cached

  const queries = buildQueries(address)
  let coords = null

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(DELAY)
    coords = await tryNominatim(queries[i])
    if (coords) break
  }

  if (!coords) throw new Error(`No se encontró: "${address}"`)
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
      () => reject(new Error('No se pudo obtener la ubicación. Activa el GPS.')),
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

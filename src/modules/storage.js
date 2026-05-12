// LocalStorage keys
const KEYS = {
  PATIENTS: 'optiruta_patients',
  GEOCACHE: 'optiruta_geocache',
  LAST_ROUTE: 'optiruta_last_route',
  SETTINGS: 'optiruta_settings',
}

export function getPatients() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]')
  } catch { return [] }
}

export function savePatients(patients) {
  localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients))
}

export function addPatient(patient) {
  const patients = getPatients()
  const newPatient = { ...patient, id: crypto.randomUUID(), createdAt: Date.now() }
  patients.unshift(newPatient)
  savePatients(patients)
  return newPatient
}

export function updatePatient(id, data) {
  const patients = getPatients()
  const idx = patients.findIndex(p => p.id === id)
  if (idx === -1) return
  patients[idx] = { ...patients[idx], ...data, updatedAt: Date.now() }
  savePatients(patients)
  return patients[idx]
}

export function deletePatient(id) {
  const patients = getPatients().filter(p => p.id !== id)
  savePatients(patients)
}

// Geocode cache
export function getGeoCache() {
  try { return JSON.parse(localStorage.getItem(KEYS.GEOCACHE) || '{}') } catch { return {} }
}

export function setGeoCache(cache) {
  localStorage.setItem(KEYS.GEOCACHE, JSON.stringify(cache))
}

export function getCachedCoords(address) {
  const key = address.toLowerCase().trim()
  return getGeoCache()[key] || null
}

export function setCachedCoords(address, coords) {
  const cache = getGeoCache()
  cache[address.toLowerCase().trim()] = coords
  setGeoCache(cache)
}

// Last route
export function saveLastRoute(route) {
  localStorage.setItem(KEYS.LAST_ROUTE, JSON.stringify({ ...route, savedAt: Date.now() }))
}

export function getLastRoute() {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.LAST_ROUTE) || 'null')
    if (!data) return null
    // Si la ruta es de otro día, descartarla
    const savedDay = new Date(data.savedAt).toDateString()
    const today = new Date().toDateString()
    if (savedDay !== today) {
      localStorage.removeItem(KEYS.LAST_ROUTE)
      return null
    }
    return data
  } catch { return null }
}

// Settings
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || 'null') || {
      defaultDuration: 20,
      transportMode: 'driving-car',
    }
  } catch { return { defaultDuration: 20, transportMode: 'driving-car' } }
}

export function saveSettings(s) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(s))
}

// Export all data as JSON backup
export function exportBackup() {
  const data = {
    patients: getPatients(),
    settings: getSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `optiruta-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Import backup
export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (data.patients) savePatients(data.patients)
        if (data.settings) saveSettings(data.settings)
        resolve(data)
      } catch { reject(new Error('Archivo inválido')) }
    }
    reader.readAsText(file)
  })
}

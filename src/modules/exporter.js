import { formatDuration, formatDistance } from './routing.js'

function formatTime(date) {
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function buildWhatsAppText(route) {
  const { stops, origin, totalDuration, totalDistance, startTime } = route
  const date = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  let text = `🗺️ *Mi ruta del ${date}*\n`
  text += `📍 *Inicio:* ${origin?.address || 'Mi ubicación actual'}\n\n`

  let currentTime = startTime ? new Date(startTime) : new Date()

  stops.forEach((stop, i) => {
    const travelMins = Math.round((stop.legDuration || 0) / 60)
    currentTime = new Date(currentTime.getTime() + travelMins * 60000)
    const arrivalStr = formatTime(currentTime)
    const durationMins = stop.visitDuration || 20

    text += `*${i + 1}.* ${stop.name}\n`
    text += `   📍 ${stop.address}\n`
    if (stop.legDuration) text += `   🚗 ${formatDuration(stop.legDuration)} | ${formatDistance(stop.legDistance || 0)}\n`
    text += `   🕐 Llegada aprox: ${arrivalStr}\n`
    text += `   ⏱️ Duración visita: ${durationMins} min\n\n`

    currentTime = new Date(currentTime.getTime() + durationMins * 60000)
  })

  text += `─────────────────\n`
  text += `📏 *Distancia total en tránsito:* ${formatDistance(totalDistance || 0)}\n`
  text += `⏱️ *Tiempo total en tránsito:* ${formatDuration(totalDuration || 0)}\n`
  if (startTime) {
    text += `🏁 *Hora estimada de fin:* ${formatTime(currentTime)}\n`
  }
  text += `\n_Ruta optimizada con OptiRuta_ 🚀`

  return text
}

export function copyToClipboard(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text)
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

export function openWaze(lat, lng) {
  // Try app deep link first, fall back to web
  const deepLink = `waze://?ll=${lat},${lng}&navigate=yes`
  const webLink = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  // On mobile devices try deep link, on desktop use web
  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    window.location.href = deepLink
    setTimeout(() => window.open(webLink, '_blank'), 1500)
  } else {
    window.open(webLink, '_blank')
  }
}

export function openWazeToStop(stop) {
  openWaze(stop.lat, stop.lng)
}

export function openGoogleMaps(stops) {
  const waypoints = stops.slice(0, -1).map(s => `${s.lat},${s.lng}`).join('|')
  const dest = stops[stops.length - 1]
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&waypoints=${waypoints}&travelmode=driving`
  window.open(url, '_blank')
}

export function printRoute() {
  window.print()
}

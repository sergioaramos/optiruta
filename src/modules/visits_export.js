import * as XLSX from 'xlsx'

const CONDITION_LABELS = {
  sin_cambios: 'Sin cambios',
  mejoria_funcional: 'Mejoría funcional',
  estacionario: 'Estacionario',
  dolor_agudizado: 'Dolor agudizado',
  regresion: 'Regresión',
  post_agudo: 'Post-agudo',
}

const ATTENDANCE_LABELS = {
  presente: 'Presente',
  ausente: 'Ausente',
  no_colabora: 'Presente - No colabora',
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch { return dateStr }
}

function fmtTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '' }
}

function calcDurationMins(arrivedAt, departedAt) {
  if (!arrivedAt || !departedAt) return ''
  const diff = new Date(departedAt) - new Date(arrivedAt)
  const mins = Math.round(diff / 60000)
  return mins > 0 ? mins : ''
}

export function exportVisitsExcel(visits, patientName = null) {
  const rows = visits.map(v => ({
    Fecha: fmtDate(v.visitDate),
    Paciente: v.patientName || '',
    Asistencia: ATTENDANCE_LABELS[v.attendance] || v.attendance,
    'Hora llegada': fmtTime(v.arrivedAt),
    'Hora salida': fmtTime(v.departedAt),
    'Duración (min)': calcDurationMins(v.arrivedAt, v.departedAt),
    'Estado clínico': CONDITION_LABELS[v.patientCondition] || v.patientCondition || '',
    'Observaciones clínicas': v.conditionNotes || '',
    'Intervención realizada': v.treatmentDone || '',
    'Texto evolución': v.evolutionText || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 45 }, { wch: 45 }, { wch: 65 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Evoluciones')
  const filename = patientName
    ? `evoluciones_${patientName.replace(/\s+/g, '_')}.xlsx`
    : `evoluciones_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}

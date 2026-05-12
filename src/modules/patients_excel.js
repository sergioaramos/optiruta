import * as XLSX from 'xlsx'
import { getPatients, savePatients, addPatient, updatePatient, deletePatient } from './storage.js'

// ─── Excel Export ───────────────────────────────────────────────────────────
export function exportPatientsExcel() {
  const patients = getPatients()
  const rows = patients.map(p => ({
    'Nombre':            p.name || '',
    'Dirección':         p.address || '',
    'Teléfono':          p.phone || '',
    'Duración (min)':    p.visitDuration ?? 20,
    'Notas':             p.notes || '',
    'Creado':            p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, // Nombre
    { wch: 40 }, // Dirección
    { wch: 16 }, // Teléfono
    { wch: 14 }, // Duración
    { wch: 35 }, // Notas
    { wch: 14 }, // Creado
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pacientes')

  const fileName = `OptiRuta-Pacientes-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─── Excel Import ───────────────────────────────────────────────────────────
export function importPatientsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws)

        if (!rows.length) { reject(new Error('El archivo está vacío')); return }

        let imported = 0
        for (const row of rows) {
          const name    = row['Nombre']?.toString().trim()
          const address = row['Dirección']?.toString().trim()
          if (!name || !address) continue

          addPatient({
            name,
            address,
            phone:         row['Teléfono']?.toString().trim()  || '',
            visitDuration: Number(row['Duración (min)'])        || 20,
            notes:         row['Notas']?.toString().trim()      || '',
          })
          imported++
        }
        resolve(imported)
      } catch (err) {
        reject(new Error('No se pudo leer el archivo Excel: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

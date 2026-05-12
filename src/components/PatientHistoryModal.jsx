import { useState, useEffect } from 'react'
import { useVisits, CONDITION_LABELS, ATTENDANCE_LABELS } from '../context/VisitsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { exportVisitsExcel } from '../modules/visits_export.js'
import VisitModal from './VisitModal.jsx'
import VisitFiles from './VisitFiles.jsx'

const ATTENDANCE_COLORS = {
  presente: '#10b981',
  ausente: '#ef4444',
  no_colabora: '#f59e0b',
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function calcDuration(arrivedAt, departedAt) {
  if (!arrivedAt || !departedAt) return null
  const mins = Math.round((new Date(departedAt) - new Date(arrivedAt)) / 60000)
  return mins > 0 ? `${mins} min` : null
}

function VisitCard({ visit, onEdit, onDelete, onCopy }) {
  const color = ATTENDANCE_COLORS[visit.attendance] || '#64748b'
  return (
    <div className="visit-history-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <span
              className="badge"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: 600 }}
            >
              {ATTENDANCE_LABELS[visit.attendance] || visit.attendance}
            </span>
            {visit.patientCondition && (
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                {CONDITION_LABELS[visit.patientCondition] || visit.patientCondition}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {fmtTime(visit.arrivedAt) && (
              <span>🕐 {fmtTime(visit.arrivedAt)}{fmtTime(visit.departedAt) ? ` → ${fmtTime(visit.departedAt)}` : ''}</span>
            )}
            {calcDuration(visit.arrivedAt, visit.departedAt) && (
              <span>⏱️ {calcDuration(visit.arrivedAt, visit.departedAt)}</span>
            )}
          </div>
          {visit.conditionNotes && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.4 }}>
              {visit.conditionNotes.length > 100 ? visit.conditionNotes.slice(0, 100) + '…' : visit.conditionNotes}
            </div>
          )}          <div style={{ marginTop: 8 }}>
            <VisitFiles visitId={visit.id} readOnly={true} />
          </div>        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon" onClick={onCopy} title="Copiar evolución" style={{ fontSize: '0.9rem' }}>📋</button>
          <button className="btn btn-ghost btn-icon" onClick={onEdit} title="Editar visita" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>✏️</button>
          <button className="btn btn-danger btn-icon" onClick={onDelete} title="Eliminar" style={{ fontSize: '0.85rem' }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

export default function PatientHistoryModal({ patient, onClose }) {
  const { visits, loading, fetchVisits, deleteVisit } = useVisits()
  const toast = useToast()
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    fetchVisits({ patientId: patient.id })
  }, [patient.id, fetchVisits])

  const handleCopy = async (visit) => {
    if (!visit.evolutionText) { toast.error('Esta visita no tiene texto de evolución guardado'); return }
    try {
      await navigator.clipboard.writeText(visit.evolutionText)
      toast.success('¡Evolución copiada! Pega en la plataforma 📋')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteVisit(id)
      toast.success('Visita eliminada')
      setConfirmDelete(null)
    } catch (e) {
      toast.error('Error al eliminar: ' + e.message)
    }
  }

  // Group visits by date
  const grouped = visits.reduce((acc, v) => {
    const key = v.visitDate || 'Sin fecha'
    if (!acc[key]) acc[key] = []
    acc[key].push(v)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const fmtDateLabel = (d) => {
    if (!d || d === 'Sin fecha') return d
    try {
      const [y, m, day] = d.split('-')
      return new Date(+y, +m - 1, +day).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return d }
  }

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
          <div className="drag-handle"><span /></div>

          <div className="modal-header">
            <div>
              <h3 className="modal-title">📋 {patient.name}</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Historial de visitas · {visits.length} {visits.length === 1 ? 'registro' : 'registros'}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingVisit(null); setShowVisitModal(true) }}
            >
              + Nueva visita
            </button>
            <button
              className="btn btn-outline"
              onClick={() => exportVisitsExcel(visits, patient.name)}
              disabled={visits.length === 0}
            >
              ⬇️ Exportar Excel
            </button>
          </div>

          {/* Visit list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 28 }}><span className="spinner" /></div>
          ) : visits.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">📋</div>
              <h3>Sin historial</h3>
              <p>Aún no hay visitas registradas para {patient.name}</p>
            </div>
          ) : (
            <div>
              {sortedDates.map(date => (
                <div key={date} style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'capitalize',
                    marginBottom: 8,
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {fmtDateLabel(date)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[date].map(v => (
                      <VisitCard
                        key={v.id}
                        visit={v}
                        onEdit={() => { setEditingVisit(v); setShowVisitModal(true) }}
                        onDelete={() => setConfirmDelete(v)}
                        onCopy={() => handleCopy(v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confirm delete */}
          {confirmDelete && (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
              <div className="modal">
                <div className="modal-header">
                  <h3 className="modal-title">Eliminar visita</h3>
                  <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)}>✕</button>
                </div>
                <p style={{ marginBottom: 20 }}>¿Eliminar la visita del <strong>{confirmDelete.visitDate}</strong>? Esta acción no se puede deshacer.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary btn-full" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  <button className="btn btn-danger btn-full" onClick={() => handleDelete(confirmDelete.id)}>🗑️ Eliminar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showVisitModal && (
        <VisitModal
          patientId={patient.id}
          patientName={patient.name}
          existingVisit={editingVisit}
          onClose={() => { setShowVisitModal(false); setEditingVisit(null) }}
          onSaved={() => fetchVisits({ patientId: patient.id })}
        />
      )}
    </>
  )
}

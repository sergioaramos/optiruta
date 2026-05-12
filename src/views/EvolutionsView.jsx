import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVisits, CONDITION_LABELS, ATTENDANCE_LABELS, todayLocal } from '../context/VisitsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { exportVisitsExcel } from '../modules/visits_export.js'
import VisitModal from '../components/VisitModal.jsx'
import { usePatients } from '../context/PatientsContext.jsx'

const ATTENDANCE_COLORS = {
  presente: '#10b981',
  ausente: '#ef4444',
  no_colabora: '#f59e0b',
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function calcDurationMins(arrivedAt, departedAt) {
  if (!arrivedAt || !departedAt) return null
  const mins = Math.round((new Date(departedAt) - new Date(arrivedAt)) / 60000)
  return mins > 0 ? mins : null
}

function fmtDateLabel(d) {
  try {
    const [y, m, day] = d.split('-')
    return new Date(+y, +m - 1, +day).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return d }
}

function navigateDate(dateStr, delta) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EvolutionsView() {
  const navigate = useNavigate()
  const { visits, loading, fetchVisits, deleteVisit } = useVisits()
  const { patients } = usePatients()
  const toast = useToast()

  const [selectedDate, setSelectedDate] = useState(todayLocal())
  const [visitModal, setVisitModal] = useState(null) // { patientId, patientName, existingVisit }
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    fetchVisits({ date: selectedDate })
  }, [selectedDate, fetchVisits])

  const handleCopy = async (visit) => {
    if (!visit.evolutionText) { toast.error('Sin texto de evolución guardado'); return }
    try {
      await navigator.clipboard.writeText(visit.evolutionText)
      toast.success('¡Evolución copiada! 📋')
    } catch { toast.error('No se pudo copiar') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteVisit(id)
      setConfirmDelete(null)
      toast.success('Visita eliminada')
    } catch (e) { toast.error('Error: ' + e.message) }
  }

  const handleNewVisit = () => {
    if (patients.length === 0) {
      toast.error('Primero agrega pacientes')
      return
    }
    setVisitModal({ patientId: null, patientName: null, existingVisit: null, selectPatient: true })
  }

  // Stats
  const total = visits.length
  const visited = visits.filter(v => v.attendance === 'presente').length
  const absent = visits.filter(v => v.attendance === 'ausente').length
  const noColabora = visits.filter(v => v.attendance === 'no_colabora').length
  const totalMins = visits.reduce((acc, v) => acc + (calcDurationMins(v.arrivedAt, v.departedAt) || 0), 0)

  const isToday = selectedDate === todayLocal()

  return (
    <div className="page fade-in">
      {/* Top bar */}
      <div className="page-topbar">
        <button className="back-btn" onClick={() => navigate('/')} title="Inicio">←</button>
        <div className="page-topbar-content">
          <div className="page-topbar-title">📋 Evoluciones</div>
          <div className="page-topbar-sub">{total} {total === 1 ? 'visita' : 'visitas'} registradas</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleNewVisit}>+ Nueva</button>
      </div>

      {/* Date navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSelectedDate(d => navigateDate(d, -1))}
          style={{ fontSize: '1.1rem' }}
        >‹</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
            {isToday ? '📅 Hoy — ' : ''}{fmtDateLabel(selectedDate)}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSelectedDate(d => navigateDate(d, 1))}
          disabled={isToday}
          style={{ fontSize: '1.1rem' }}
        >›</button>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="stats-row" style={{ marginBottom: 14 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#10b981' }}>{visited}</div>
            <div className="stat-label">Visitados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ef4444' }}>{absent}</div>
            <div className="stat-label">Ausentes</div>
          </div>
          {noColabora > 0 && (
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f59e0b' }}>{noColabora}</div>
              <div className="stat-label">No colabora</div>
            </div>
          )}
          {totalMins > 0 && (
            <div className="stat-card">
              <div className="stat-value">{totalMins}</div>
              <div className="stat-label">Min totales</div>
            </div>
          )}
        </div>
      )}

      {/* Visit list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : visits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>Sin visitas {isToday ? 'hoy' : 'este día'}</h3>
          <p>Registra las visitas de la jornada para llevar el historial de evoluciones</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleNewVisit}>
            + Registrar visita
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {visits.map(v => {
              const color = ATTENDANCE_COLORS[v.attendance] || '#64748b'
              const duration = calcDurationMins(v.arrivedAt, v.departedAt)
              return (
                <div key={v.id} className="visit-history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 4 }}>{v.patientName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span
                          className="badge"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40`, fontWeight: 600 }}
                        >
                          {ATTENDANCE_LABELS[v.attendance] || v.attendance}
                        </span>
                        {v.patientCondition && (
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            {CONDITION_LABELS[v.patientCondition]}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {fmtTime(v.arrivedAt) && (
                          <span>🕐 {fmtTime(v.arrivedAt)}{fmtTime(v.departedAt) ? ` → ${fmtTime(v.departedAt)}` : ''}</span>
                        )}
                        {duration && <span>⏱️ {duration} min</span>}
                      </div>
                      {v.conditionNotes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.4 }}>
                          {v.conditionNotes.length > 90 ? v.conditionNotes.slice(0, 90) + '…' : v.conditionNotes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleCopy(v)} title="Copiar evolución">📋</button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setVisitModal({ patientId: v.patientId, patientName: v.patientName, existingVisit: v })}
                        title="Editar visita"
                        style={{ color: 'var(--primary)' }}
                      >✏️</button>
                      <button className="btn btn-danger btn-icon" onClick={() => setConfirmDelete(v)} title="Eliminar">🗑️</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Export */}
          <button className="btn btn-outline btn-full" onClick={() => exportVisitsExcel(visits)}>
            ⬇️ Exportar Excel del día
          </button>
        </>
      )}

      {/* Select patient modal (for new visit from this view) */}
      {visitModal?.selectPatient && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVisitModal(null)}>
          <div className="modal" style={{ maxHeight: '80dvh', overflowY: 'auto' }}>
            <div className="drag-handle"><span /></div>
            <div className="modal-header">
              <h3 className="modal-title">Seleccionar paciente</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setVisitModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patients.map(p => (
                <button
                  key={p.id}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 14px' }}
                  onClick={() => setVisitModal({ patientId: p.id, patientName: p.name, existingVisit: null })}
                >
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>📍 {p.address}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visit modal */}
      {visitModal && !visitModal.selectPatient && (
        <VisitModal
          patientId={visitModal.patientId}
          patientName={visitModal.patientName}
          existingVisit={visitModal.existingVisit}
          onClose={() => setVisitModal(null)}
          onSaved={() => fetchVisits({ date: selectedDate })}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Eliminar visita</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p style={{ marginBottom: 20 }}>
              ¿Eliminar la visita de <strong>{confirmDelete.patientName}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(confirmDelete.id)}>🗑️ Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLastRoute, saveLastRoute } from '../modules/storage.js'
import { formatDuration, formatDistance, getRoute } from '../modules/routing.js'
import { buildWhatsAppText, copyToClipboard, openGoogleMaps, openWaze, printRoute } from '../modules/exporter.js'
import { useToast } from '../context/ToastContext.jsx'
import { useVisits, todayLocal } from '../context/VisitsContext.jsx'
import RouteMap from '../components/RouteMap.jsx'
import VisitModal from '../components/VisitModal.jsx'

function formatTime(isoString, offsetMins) {
  const d = new Date(new Date(isoString).getTime() + offsetMins * 60000)
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function RouteView() {
  const navigate = useNavigate()
  const toast = useToast()
  const { visits, fetchVisits, upsertVisit } = useVisits()
  const [route, setRoute] = useState(() => getLastRoute())
  const [showExport, setShowExport] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [visitModal, setVisitModal] = useState(null) // { patientId, patientName, existingVisit }

  // Load today's visits to show status badges
  useEffect(() => {
    fetchVisits({ date: todayLocal() })
  }, [fetchVisits])

  // Map patientId → visit for quick lookup
  const visitByPatient = Object.fromEntries(visits.map(v => [v.patientId, v]))

  if (!route || !route.stops?.length) {
    return (
      <div className="page fade-in">
        <div className="page-topbar">
          <button className="back-btn" onClick={() => navigate('/')} id="btn-back-home">←</button>
          <div className="page-topbar-content">
            <div className="page-topbar-title">Mi ruta</div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🗺️</div>
          <h3>Sin ruta activa</h3>
          <p>Planifica tu ruta del día primero</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/planificar')} id="btn-go-plan">
            ⚡ Planificar ahora
          </button>
        </div>
      </div>
    )
  }

  const { origin, stops, totalDuration, totalDistance, startTime, mode } = route

  // Compute cumulative arrival times
  let cumMins = 0
  const stopsWithTime = stops.map((stop) => {
    const travelMins = Math.round((stop.legDuration || 0) / 60)
    cumMins += travelMins
    const arrival = formatTime(startTime, cumMins)
    cumMins += (stop.visitDuration || 20)
    return { stop, arrival }
  })
  const finishTime = formatTime(startTime, cumMins)
  const totalVisitMins = stops.reduce((a, s) => a + (s.visitDuration || 20), 0)

  // Remove a stop and save
  const handleRemoveStop = (idx) => {
    const newStops = stops.filter((_, i) => i !== idx)
    if (newStops.length === 0) { toast.error('Debe quedar al menos una parada'); return }
    const newTotalDuration = newStops.reduce((a, s) => a + (s.legDuration || 0), 0)
    const newTotalDistance = newStops.reduce((a, s) => a + (s.legDistance || 0), 0)
    const updated = { ...route, stops: newStops, totalDuration: newTotalDuration, totalDistance: newTotalDistance }
    setRoute(updated)
    saveLastRoute(updated)
    toast.success('Parada eliminada de la ruta')
  }

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppText({ ...route })
    await copyToClipboard(text)
    toast.success('¡Copiado al portapapeles! Pega en WhatsApp 📱')
    setShowExport(false)
  }

  const handleOpenGMaps = () => {
    const validStops = stops.filter(s => s.lat && s.lng)
    if (!validStops.length) { toast.error('Sin coordenadas disponibles'); return }
    openGoogleMaps(validStops)
  }

  return (
    <div className="page fade-in">

      {/* Top bar */}
      <div className="page-topbar">
        <button className="back-btn" onClick={() => navigate('/')} id="btn-back-home">←</button>
        <div className="page-topbar-content">
          <div className="page-topbar-title">🗺️ Ruta de hoy</div>
          <div className="page-topbar-sub">{stops.length} paradas · {mode === 'driving-car' ? '🚗 Carro' : '🚶 A pie'}</div>
        </div>
        <button
          className={`btn btn-sm ${editMode ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => setEditMode(e => !e)}
          id="btn-toggle-edit"
        >
          {editMode ? '✓ Listo' : '✏️ Editar'}
        </button>
      </div>

      {editMode && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span>Modo edición: toca 🗑️ para eliminar una parada de la ruta.</span>
        </div>
      )}

      {/* Map */}
      <div style={{ marginBottom: 14 }}>
        <RouteMap origin={origin} stops={stops.filter(s => s.lat)} />
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalDuration)}</div>
          <div className="stat-label">En tránsito</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatDistance(totalDistance)}</div>
          <div className="stat-label">Distancia</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem' }}>{finishTime}</div>
          <div className="stat-label">Fin estimado</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={handleOpenGMaps} id="btn-open-gmaps">🗺️ Google Maps</button>
        <button className="btn btn-secondary" onClick={() => { const s = stops[0]; if (s) openWaze(s.lat, s.lng) }} id="btn-open-waze">🚗 Waze</button>
        <button className="btn btn-secondary" onClick={() => setShowExport(true)} id="btn-export">📤 Exportar</button>
        <button className="btn btn-secondary" onClick={() => navigate('/planificar')} id="btn-replan">🔄 Replannear</button>
      </div>

      {/* Stop list */}
      <p className="section-label">Orden de visitas</p>

      {/* Origin */}
      <div style={{ display: 'flex', gap: 13, padding: '12px 15px', background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏠</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Punto de inicio</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{origin?.address || 'Ubicación actual'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stopsWithTime.map(({ stop, arrival }, i) => (
          <div key={stop.id || i} className="stop-card" style={{ position: 'relative' }}>
            <div className="stop-number">{i + 1}</div>
            <div className="stop-content">
              <div className="stop-name">{stop.name}</div>
              <div className="stop-address">📍 {stop.address}</div>
              {stop.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>📞 {stop.phone}</div>}
              <div className="stop-meta">
                {stop.legDuration > 0 && (
                  <>
                    <span className="stop-meta-item">🚗 {formatDuration(stop.legDuration)}</span>
                    <span className="stop-meta-item">📏 {formatDistance(stop.legDistance || 0)}</span>
                  </>
                )}
                <span className="stop-meta-item">🕐 {arrival}</span>
                <span className="stop-meta-item">⏱️ {stop.visitDuration || 20} min</span>
              </div>
              {stop.notes && (
                <div style={{ marginTop: 8, padding: '7px 10px', background: 'var(--surface-3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  📝 {stop.notes}
                </div>
              )}
              {/* Visit action row */}
              {stop.id && (() => {
                const existingVisit = visitByPatient[stop.id]
                const ATTENDANCE_COLORS = { presente: '#10b981', ausente: '#ef4444', no_colabora: '#f59e0b' }
                const acColor = existingVisit ? (ATTENDANCE_COLORS[existingVisit.attendance] || '#64748b') : null
                return (
                  <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <button
                      className="btn btn-sm"
                      style={{
                        background: existingVisit ? `${acColor}15` : 'var(--surface-2)',
                        border: `1.5px solid ${existingVisit ? acColor : 'var(--border)'}`,
                        color: existingVisit ? acColor : 'var(--text-muted)',
                        borderRadius: 999,
                        fontSize: '0.76rem',
                        fontWeight: existingVisit ? 600 : 400,
                      }}
                      onClick={() => setVisitModal({ patientId: stop.id, patientName: stop.name, existingVisit: existingVisit || null })}
                    >
                      {existingVisit ? `📋 Ver / editar visita` : '📋 Registrar visita'}
                    </button>
                    {existingVisit && existingVisit.evolutionText && (
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: '0.76rem', color: 'var(--primary)' }}
                        title="Copiar evolución"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(existingVisit.evolutionText)
                            toast.success('¡Evolución copiada! 📋')
                          } catch { toast.error('No se pudo copiar') }
                        }}
                      >
                        📋 Copiar texto
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
            {editMode && (
              <button
                className="btn btn-danger btn-icon"
                style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.85rem' }}
                onClick={() => handleRemoveStop(i)}
                id={`btn-remove-stop-${i}`}
                title="Eliminar parada"
              >🗑️</button>
            )}
          </div>
        ))}
      </div>

      {/* Finish */}
      <div style={{ display: 'flex', gap: 13, padding: '12px 15px', background: 'rgba(8,145,178,0.06)', border: '1.5px solid rgba(8,145,178,0.25)', borderRadius: 'var(--radius)', marginTop: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏁</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Fin estimado: {finishTime}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {formatDuration(totalVisitMins * 60)} en visitas · {formatDuration(totalDuration)} en tránsito
          </div>
        </div>
      </div>

      {/* Export modal */}
      {showExport && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowExport(false)}>
          <div className="modal">
            <div className="drag-handle"><span /></div>
            <div className="modal-header">
              <h3 className="modal-title">📤 Exportar ruta</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowExport(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-success btn-lg" onClick={handleCopyWhatsApp} id="btn-copy-whatsapp">
                💬 Copiar para WhatsApp
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => { printRoute(); setShowExport(false) }} id="btn-print-modal">
                🖨️ Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visit modal */}
      {visitModal && (
        <VisitModal
          patientId={visitModal.patientId}
          patientName={visitModal.patientName}
          existingVisit={visitModal.existingVisit}
          onClose={() => setVisitModal(null)}
          onSaved={() => fetchVisits({ date: todayLocal() })}
        />
      )}
    </div>
  )
}

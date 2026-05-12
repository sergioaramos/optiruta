import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../context/PatientsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PERSONAL_MODE, personal } from '../config/personal.js'
import { geocodeAddress, getCurrentLocation, reverseGeocode } from '../modules/geocoder.js'
import { getDurationMatrix } from '../modules/routing.js'
import { optimizeRoute, reorderPoints } from '../modules/optimizer.js'
import { saveLastRoute, getSettings } from '../modules/storage.js'
import PatientModal from '../components/PatientModal.jsx'

const MODES = [
  { id: 'driving-car', label: '🚗 Carro' },
  { id: 'foot-walking', label: '🚶 A pie' },
]

function ProgressOverlay({ step, total, message }) {
  const pct = total > 0 ? Math.round((step / total) * 100) : 0
  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="modal" style={{ maxHeight: 'auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚡</div>
        <h3 style={{ marginBottom: 8 }}>Optimizando ruta...</h3>
        <p style={{ marginBottom: 20 }}>{message}</p>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pct}% completado</p>
      </div>
    </div>
  )
}

export default function PlanifierView() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const toast = useToast()
  const settings = getSettings()

  const [selected, setSelected] = useState([]) // selected patients for today
  const [manualStop, setManualStop] = useState({ name: '', address: '' })
  const [mode, setMode] = useState(settings.transportMode || 'driving-car')
  const [originMode, setOriginMode] = useState('gps') // 'gps' | 'manual'
  const [originAddress, setOriginAddress] = useState('')
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0)
    return `${String(d.getHours()).padStart(2,'0')}:00`
  })
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [loadTotal, setLoadTotal] = useState(0)
  const [loadMsg, setLoadMsg] = useState('')
  const [tab, setTab] = useState('saved') // 'saved' | 'manual'

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  )

  const togglePatient = (p) => {
    setSelected(prev =>
      prev.find(s => s.id === p.id)
        ? prev.filter(s => s.id !== p.id)
        : [...prev, { ...p }]
    )
  }

  const addManual = () => {
    if (!manualStop.name.trim() || !manualStop.address.trim()) {
      toast.error('Ingresa nombre y dirección')
      return
    }
    setSelected(prev => [...prev, {
      ...manualStop,
      id: `manual-${Date.now()}`,
      visitDuration: settings.defaultDuration,
      isManual: true,
    }])
    setManualStop({ name: '', address: '' })
    toast.success(`${manualStop.name} agregado`)
  }

  const removeSelected = (id) => setSelected(prev => prev.filter(s => s.id !== id))

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleOptimize = useCallback(async () => {
    if (selected.length < 1) { toast.error('Agrega al menos una parada'); return }

    setLoading(true)
    try {
      // 1. Get origin
      setLoadMsg('Obteniendo punto de partida...')
      setLoadStep(0); setLoadTotal(selected.length + 3)

      let origin = { lat: null, lng: null, address: 'Mi ubicación' }
      if (originMode === 'gps') {
        const loc = await getCurrentLocation()
        origin.lat = loc.lat; origin.lng = loc.lng
        setLoadMsg('Obteniendo dirección...')
        origin.address = await reverseGeocode(loc.lat, loc.lng).catch(() => 'Ubicación actual')
      } else {
        if (!originAddress.trim()) { toast.error('Ingresa la dirección de inicio'); setLoading(false); return }
        setLoadMsg('Geocodificando punto de inicio...')
        const coords = await geocodeAddress(originAddress)
        origin = { ...coords, address: originAddress }
      }
      setLoadStep(1)

      // 2. Geocode all stops (skip if coords already saved)
      setLoadMsg('Verificando ubicaciones...')
      const stops = []
      for (let i = 0; i < selected.length; i++) {
        const s = selected[i]
        // Use stored coords if available — no API call needed
        if (s.lat && s.lng) {
          stops.push({ ...s })
          setLoadStep(2 + i)
          continue
        }
        setLoadMsg(`Buscando ubicación ${i + 1}/${selected.length}: ${s.name}`)
        try {
          const coords = await geocodeAddress(s.address)
          stops.push({ ...s, lat: coords.lat, lng: coords.lng })
        } catch {
          toast.error(`No se encontró: ${s.address}`)
          stops.push({ ...s, lat: null, lng: null })
        }
        setLoadStep(2 + i)
        await new Promise(r => setTimeout(r, 50))
      }

      const validStops = stops.filter(s => s.lat)
      if (!validStops.length) { toast.error('Ninguna dirección pudo ser geocodificada'); setLoading(false); return }

      // 3. Build matrix with origin as index 0
      setLoadMsg('Calculando tiempos en carretera...')
      const allPoints = [origin, ...validStops]
      const { durations, distances } = await getDurationMatrix(allPoints, mode)
      setLoadStep(allPoints.length + 2)

      // 4. Optimize (index 0 = origin, fixed)
      setLoadMsg('Optimizando ruta...')
      const { order } = optimizeRoute(durations)
      // order[0] must be 0 (origin) — it always is with nearest neighbor from 0
      const orderedStops = order.slice(1).map(i => validStops[i - 1])

      // 5. Build route result
      const legs = []
      let prev = 0
      for (let i = 1; i < order.length; i++) {
        const from = order[i - 1], to = order[i]
        legs.push({ duration: durations[from][to], distance: distances?.[from]?.[to] || 0 })
      }

      const stopsWithLegs = orderedStops.map((s, i) => ({
        ...s,
        legDuration: legs[i]?.duration || 0,
        legDistance: legs[i]?.distance || 0,
      }))

      const totalDuration = legs.reduce((a, l) => a + l.duration, 0)
      const totalDistance = legs.reduce((a, l) => a + l.distance, 0)

      const result = {
        origin, stops: stopsWithLegs, mode,
        totalDuration, totalDistance,
        startTime: startTime ? (() => {
          const d = new Date()
          const [h, m] = startTime.split(':')
          d.setHours(+h, +m, 0, 0)
          return d.toISOString()
        })() : new Date().toISOString(),
      }

      saveLastRoute(result)
      setLoadStep(allPoints.length + 3)
      toast.success(PERSONAL_MODE ? personal.routeSuccessMsg : '¡Ruta optimizada! 🎉')
      navigate('/ruta')
    } catch (err) {
      toast.error(err.message || 'Error al optimizar')
    } finally {
      setLoading(false)
    }
  }, [selected, mode, originMode, originAddress, startTime, navigate, toast])

  return (
    <div className="page fade-in">
      {loading && <ProgressOverlay step={loadStep} total={loadTotal} message={loadMsg} />}

      <div className="page-topbar">
        <button className="back-btn" onClick={() => navigate('/')} id="btn-back-home">←</button>
        <div className="page-topbar-content">
          <div className="page-topbar-title">Planificar ruta</div>
          <div className="page-topbar-sub">Selecciona las visitas de hoy</div>
        </div>
      </div>

      {PERSONAL_MODE && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 14, textAlign: 'center' }}>
          {personal.plannerHint}
        </p>
      )}

      {/* Punto de partida */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>📍 Punto de partida</h3>
        <div className="chip-group" style={{ marginBottom: 12 }}>
          <button className={`chip ${originMode === 'gps' ? 'active' : ''}`} onClick={() => setOriginMode('gps')} id="chip-gps">📡 Mi ubicación GPS</button>
          <button className={`chip ${originMode === 'manual' ? 'active' : ''}`} onClick={() => setOriginMode('manual')} id="chip-manual-origin">✏️ Ingresar dirección</button>
        </div>
        {originMode === 'manual' && (
          <input className="form-input" placeholder="Ej: Cra 23 #45-12, Manizales" value={originAddress}
            onChange={e => setOriginAddress(e.target.value)} id="origin-address-input" />
        )}
      </div>

      {/* Hora de inicio + Modo transporte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Hora inicio</p>
          <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} id="start-time-input" style={{ padding: '8px 12px' }} />
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Transporte</p>
          <div className="chip-group">
            {MODES.map(m => (
              <button key={m.id} className={`chip ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)} id={`chip-mode-${m.id}`} style={{ fontSize: '0.78rem', padding: '6px 10px' }}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected stops */}
      {selected.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>🗓️ Visitas de hoy ({selected.length})</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])} id="btn-clear-all">Limpiar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selected.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="patient-avatar" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>{s.isManual ? '📌' : s.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="patient-name" style={{ fontSize: '0.88rem' }}>{s.name}</div>
                  <div className="patient-address">{s.address}</div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => removeSelected(s.id)} style={{ fontSize: '1rem', color: 'var(--danger)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add patients tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 4 }}>
        {[{ id: 'saved', label: '👥 Guardados' }, { id: 'manual', label: '✏️ Dirección nueva' }].map(t => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'} btn-full btn-sm`}
            onClick={() => setTab(t.id)} id={`tab-${t.id}`} style={{ flex: 1 }}>{t.label}</button>
        ))}
      </div>

      {tab === 'saved' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="form-input-icon">
            <span className="input-icon">🔍</span>
            <input className="form-input" placeholder="Buscar paciente..." value={search}
              onChange={e => setSearch(e.target.value)} id="patient-search" />
          </div>
          {filteredPatients.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-icon">👥</div>
              <h3>Sin pacientes guardados</h3>
              <p>Agrega pacientes desde la sección Pacientes</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)} id="btn-add-patient-quick">+ Nuevo paciente</button>
            </div>
          ) : (
            filteredPatients.map(p => {
              const isSel = selected.some(s => s.id === p.id)
              return (
                <div key={p.id} className={`patient-card ${isSel ? 'selected' : ''}`} onClick={() => togglePatient(p)} id={`patient-card-${p.id}`}>
                  <div className="patient-avatar">{p.name.charAt(0)}</div>
                  <div className="patient-info">
                    <div className="patient-name">{p.name}</div>
                    <div className="patient-address">📍 {p.address}</div>
                    {p.visitDuration && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 }}>⏱️ {p.visitDuration} min</div>}
                  </div>
                  <span style={{ fontSize: '1.3rem', color: isSel ? 'var(--success)' : 'var(--border)' }}>{isSel ? '✅' : '⊕'}</span>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input className="form-input" placeholder="Ej: Paciente ocasional" value={manualStop.name}
                onChange={e => setManualStop(f => ({ ...f, name: e.target.value }))} id="manual-name-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input className="form-input" placeholder="Ej: Cll 50 #18-30, Manizales" value={manualStop.address}
                onChange={e => setManualStop(f => ({ ...f, address: e.target.value }))} id="manual-address-input" />
            </div>
            <button className="btn btn-secondary btn-full" onClick={addManual} id="btn-add-manual">➕ Agregar a la ruta</button>
          </div>
        </div>
      )}

      {/* Optimize button */}
      <div style={{ marginTop: 20, paddingBottom: 'calc(var(--bottom-nav) + 16px)' }}>
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={handleOptimize}
          disabled={selected.length === 0 || loading}
          id="btn-optimize"
        >
          {loading ? <><span className="spinner" style={{ width: 20, height: 20 }} /> Optimizando...</> : `⚡ Optimizar ${selected.length > 0 ? `(${selected.length} paradas)` : 'ruta'}`}
        </button>
      </div>

      {showModal && <PatientModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

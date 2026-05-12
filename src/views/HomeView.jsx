import { useNavigate } from 'react-router-dom'
import { usePatients } from '../context/PatientsContext.jsx'
import { getLastRoute } from '../modules/storage.js'
import { formatDuration, formatDistance } from '../modules/routing.js'
import { PERSONAL_MODE, personal, getMotivationalMessage } from '../config/personal.js'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '☀️ Buenos días'
  if (h < 18) return '🌤️ Buenas tardes'
  return '🌙 Buenas noches'
}

function getTodayStr() {
  const d = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default function HomeView() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const lastRoute = getLastRoute()
  const hasLastRoute = lastRoute && lastRoute.stops?.length > 0
  const isToday = hasLastRoute && new Date(lastRoute.savedAt).toDateString() === new Date().toDateString()
  const motivational = PERSONAL_MODE ? getMotivationalMessage() : null

  return (
    <div className="page fade-in">

      {/* Hero Banner */}
      <div className="hero-banner" style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{getTodayStr()}</p>
        <h1 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: 6 }}>
          {getGreeting()}{PERSONAL_MODE ? `, ${personal.nickname}` : ''} 👋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0 }}>
          {PERSONAL_MODE
            ? personal.greetingSub(patients.length)
            : patients.length > 0
              ? `${patients.length} paciente${patients.length !== 1 ? 's' : ''} en tu agenda`
              : 'Bienvenida a OptiRuta'}
        </p>
        {PERSONAL_MODE && motivational && (
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', marginTop: 6, marginBottom: 0, fontStyle: 'italic' }}>
            {motivational}
          </p>
        )}
        {isToday && hasLastRoute && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>
            <span className="pulse-dot" style={{ background: '#fff' }} />
            Ruta activa hoy
          </span>
        )}
      </div>

      {/* Main CTA */}
      <button id="btn-start-route" className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/planificar')} style={{ marginBottom: 10 }}>
        {PERSONAL_MODE ? personal.planBtnLabel : '⚡ Planificar ruta del día'}
      </button>

      {hasLastRoute && isToday && (
        <button id="btn-view-last-route" className="btn btn-success btn-lg btn-full" onClick={() => navigate('/ruta')} style={{ marginBottom: 20 }}>
          🗺️ Ver / editar ruta de hoy
        </button>
      )}

      {!isToday && <div style={{ height: 16 }} />}

      {/* Stats */}
      {hasLastRoute && (
        <div style={{ marginBottom: 22 }}>
          <p className="section-label">{isToday ? 'Resumen de hoy' : 'Última ruta'}</p>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{lastRoute.stops?.length || 0}</div>
              <div className="stat-label">Paradas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDuration(lastRoute.totalDuration || 0)}</div>
              <div className="stat-label">Tránsito</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDistance(lastRoute.totalDistance || 0)}</div>
              <div className="stat-label">Distancia</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick access */}
      <p className="section-label">Acceso rápido</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ cursor: 'pointer', padding: '18px 16px' }} onClick={() => navigate('/pacientes')} id="card-patients">
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>👥</div>
          <h3 style={{ fontSize: '0.92rem', marginBottom: 4 }}>Pacientes</h3>
          <p style={{ fontSize: '0.78rem' }}>{patients.length} guardados</p>
        </div>
        <div className="card" style={{ cursor: 'pointer', padding: '18px 16px' }} onClick={() => navigate('/planificar')} id="card-plan">
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🗓️</div>
          <h3 style={{ fontSize: '0.92rem', marginBottom: 4 }}>Planificar</h3>
          <p style={{ fontSize: '0.78rem' }}>Optimiza tu día</p>
        </div>
      </div>

      {/* Onboarding */}
      {patients.length === 0 && (
        <div className="card card-accent">
          <h3 style={{ marginBottom: 10, color: 'var(--primary)' }}>🚀 Cómo funciona</h3>
          {[
            ['1️⃣', 'Agrega tus pacientes con su dirección'],
            ['2️⃣', 'Selecciona a quiénes visitas hoy'],
            ['3️⃣', 'La app calcula la ruta más eficiente'],
            ['4️⃣', 'Navega con Google Maps o Waze'],
          ].map(([n, t]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ fontSize: '1.1rem' }}>{n}</span>
              <span style={{ fontSize: '0.87rem', color: 'var(--text-muted)' }}>{t}</span>
            </div>
          ))}
          {PERSONAL_MODE && (
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
              {personal.emptyPatientsMsg}
            </p>
          )}
          <button className="btn btn-primary btn-full" style={{ marginTop: 4 }} onClick={() => navigate('/pacientes')} id="btn-add-first-patient">
            👤 Agregar primer paciente
          </button>
        </div>
      )}
    </div>
  )
}

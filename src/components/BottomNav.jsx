import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/',          icon: '🏠', label: 'Inicio' },
  { path: '/planificar', icon: '🗓️', label: 'Planificar' },
  { path: '/ruta',      icon: '🗺️', label: 'Ruta' },
  { path: '/pacientes', icon: '👥', label: 'Pacientes' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path))
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

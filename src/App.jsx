import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { PatientsProvider } from './context/PatientsContext.jsx'
import { VisitsProvider } from './context/VisitsContext.jsx'
import { FilesProvider } from './context/FilesContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomeView from './views/HomeView.jsx'
import PlanifierView from './views/PlanifierView.jsx'
import RouteView from './views/RouteView.jsx'
import PatientsView from './views/PatientsView.jsx'
import EvolutionsView from './views/EvolutionsView.jsx'
import LoginView from './views/LoginView.jsx'

function AppShell() {
  const { session } = useAuth()

  // Aún cargando la sesión
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  // Sin sesión → Login
  if (!session) return <LoginView />

  // Con sesión → App
  return (
    <PatientsProvider>
      <VisitsProvider>
        <FilesProvider>
        <div className="app-container">
          <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/planificar" element={<PlanifierView />} />
              <Route path="/ruta" element={<RouteView />} />
              <Route path="/pacientes" element={<PatientsView />} />
              <Route path="/evoluciones" element={<EvolutionsView />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
        </FilesProvider>
      </VisitsProvider>
    </PatientsProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  )
}

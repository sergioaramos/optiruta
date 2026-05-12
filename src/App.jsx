import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext.jsx'
import { PatientsProvider } from './context/PatientsContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomeView from './views/HomeView.jsx'
import PlanifierView from './views/PlanifierView.jsx'
import RouteView from './views/RouteView.jsx'
import PatientsView from './views/PatientsView.jsx'

export default function App() {
  return (
    <ToastProvider>
      <PatientsProvider>
        <div className="app-container">
          <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/planificar" element={<PlanifierView />} />
              <Route path="/ruta" element={<RouteView />} />
              <Route path="/pacientes" element={<PatientsView />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </PatientsProvider>
    </ToastProvider>
  )
}

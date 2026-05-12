import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../context/PatientsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { exportPatientsExcel, importPatientsExcel } from '../modules/patients_excel.js'
import PatientModal from '../components/PatientModal.jsx'

export default function PatientsView() {
  const navigate = useNavigate()
  const { patients, remove } = usePatients()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPatient, setEditPatient] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id) => {
    remove(id)
    setConfirmDelete(null)
    toast.success('Paciente eliminado')
  }

  const handleExport = () => {
    try {
      exportPatientsExcel()
      toast.success('Excel exportado correctamente ✓')
    } catch (e) {
      toast.error('Error al exportar: ' + e.message)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const count = await importPatientsExcel(file)
      toast.success(`${count} paciente${count !== 1 ? 's' : ''} importado${count !== 1 ? 's' : ''} ✓`)
    } catch (err) {
      toast.error(err.message)
    }
    e.target.value = ''
  }

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="page fade-in">

      {/* Top bar with back button */}
      <div className="page-topbar">
        <button className="back-btn" onClick={() => navigate('/')} id="btn-back-home" title="Volver al inicio">←</button>
        <div className="page-topbar-content">
          <div className="page-topbar-title">Pacientes</div>
          <div className="page-topbar-sub">{patients.length} registrado{patients.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditPatient(null); setShowModal(true) }} id="btn-new-patient">
          + Nuevo
        </button>
      </div>



      {/* Search */}
      <div className="form-input-icon" style={{ marginBottom: 16 }}>
        <span className="input-icon">🔍</span>
        <input className="form-input" placeholder="Buscar por nombre o dirección..." value={search}
          onChange={e => setSearch(e.target.value)} id="patients-search" />
      </div>

      {/* Patient list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{search ? '🔍' : '👥'}</div>
          <h3>{search ? 'Sin resultados' : 'Sin pacientes aún'}</h3>
          <p>{search ? 'Intenta con otro término' : 'Agrega tu primer paciente para comenzar'}</p>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)} id="btn-add-first">
              👤 Agregar paciente
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ padding: '14px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="patient-avatar">{getInitials(p.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="patient-name" style={{ fontSize: '0.97rem' }}>{p.name}</div>
                  <div className="patient-address">📍 {p.address}</div>
                  <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
                    {p.phone && <span className="badge badge-primary">📞 {p.phone}</span>}
                    <span className="badge badge-success">⏱️ {p.visitDuration || 20} min</span>
                  </div>
                  {p.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>📝 {p.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setEditPatient(p); setShowModal(true) }} id={`btn-edit-${p.id}`} title="Editar" style={{ color: 'var(--primary)' }}>✏️</button>
                  <button className="btn btn-danger btn-icon" onClick={() => setConfirmDelete(p)} id={`btn-delete-${p.id}`} title="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Excel Backup */}
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>📊 Importar / Exportar Excel</h3>
        <p style={{ fontSize: '0.83rem', marginBottom: 14 }}>Gestiona tu lista de pacientes desde una hoja de cálculo.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-full" onClick={handleExport} id="btn-export-excel">
            ⬇️ Exportar .xlsx
          </button>
          <label className="btn btn-secondary btn-full" style={{ cursor: 'pointer' }} id="label-import-excel">
            ⬆️ Importar .xlsx
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Eliminar paciente</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p style={{ marginBottom: 20 }}>¿Eliminar a <strong>{confirmDelete.name}</strong>? Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setConfirmDelete(null)} id="btn-cancel-delete">Cancelar</button>
              <button className="btn btn-danger btn-full" onClick={() => handleDelete(confirmDelete.id)} id="btn-confirm-delete">🗑️ Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <PatientModal initialData={editPatient} onClose={() => { setShowModal(false); setEditPatient(null) }} />
      )}
    </div>
  )
}

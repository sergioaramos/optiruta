import { useState } from 'react'
import { usePatients } from '../context/PatientsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getSettings } from '../modules/storage.js'

export default function PatientModal({ onClose, onSelect, initialData = null }) {
  const { add, update } = usePatients()
  const toast = useToast()
  const settings = getSettings()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    notes: initialData?.notes || '',
    visitDuration: initialData?.visitDuration ?? settings.defaultDuration,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      toast.error('Nombre y dirección son obligatorios')
      return
    }
    if (isEdit) {
      update(initialData.id, form)
      toast.success('Paciente actualizado ✓')
    } else {
      const p = add(form)
      toast.success('Paciente guardado ✓')
      onSelect && onSelect(p)
    }
    onClose()
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="drag-handle"><span /></div>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <div className="form-input-icon">
              <span className="input-icon">👤</span>
              <input
                className="form-input"
                placeholder="Ej: María García"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                autoFocus
                id="patient-name-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <div className="form-input-icon">
              <span className="input-icon">📍</span>
              <input
                className="form-input"
                placeholder="Ej: Cra 23 #45-12, Manizales"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                id="patient-address-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                className="form-input"
                placeholder="300 000 0000"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                type="tel"
                id="patient-phone-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duración (min)</label>
              <input
                className="form-input"
                type="number"
                min={5} max={240}
                value={form.visitDuration}
                onChange={e => set('visitDuration', Number(e.target.value))}
                id="patient-duration-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea
              className="form-input"
              placeholder="Observaciones, indicaciones especiales..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              style={{ resize: 'vertical' }}
              id="patient-notes-input"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-full" id="patient-save-btn">
              {isEdit ? '💾 Guardar' : '➕ Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

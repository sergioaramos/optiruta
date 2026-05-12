import { useState } from 'react'
import { usePatients } from '../context/PatientsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getSettings } from '../modules/storage.js'
import AddressAutocomplete from './AddressAutocomplete.jsx'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function PatientModal({ onClose, onSelect, initialData = null }) {
  const { add, update } = usePatients()
  const toast = useToast()
  const settings = getSettings()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    name: initialData?.name || '',
    document: initialData?.document || '',
    birthDate: initialData?.birthDate || '',
    address: initialData?.address || '',
    addressDetail: initialData?.addressDetail || '',
    lat: initialData?.lat ?? null,
    lng: initialData?.lng ?? null,
    phone: initialData?.phone || '',
    phone2: initialData?.phone2 || '',
    email: initialData?.email || '',
    bloodType: initialData?.bloodType || '',
    companion: initialData?.companion || '',
    companionRelation: initialData?.companionRelation || '',
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
      <div className="modal" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="drag-handle"><span /></div>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Editar paciente' : 'Nuevo paciente'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Identificación */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Identificación</p>
          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <div className="form-input-icon">
              <span className="input-icon">👤</span>
              <input
                className="form-input"
                placeholder="Ej: María García López"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                autoFocus
                id="patient-name-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Documento</label>
              <input
                className="form-input"
                placeholder="Cédula / ID"
                value={form.document}
                onChange={e => set('document', e.target.value)}
                id="patient-document-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de nacimiento</label>
              <input
                className="form-input"
                type="date"
                value={form.birthDate}
                onChange={e => set('birthDate', e.target.value)}
                id="patient-birthdate-input"
              />
            </div>
          </div>

          {/* Dirección */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Ubicación</p>
          <div className="form-group">
            <label className="form-label">Dirección *</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(addr) => set('address', addr)}
              onSelect={({ address, lat, lng }) => setForm(f => ({ ...f, address, lat, lng }))}
              id="patient-address-input"
            />
            {form.lat && (
              <p style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4 }}>
                ✅ Ubicación verificada en el mapa
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Detalles de la dirección</label>
            <input
              className="form-input"
              placeholder="Apto 602, Piso 3, Casa azul, Portón negro..."
              value={form.addressDetail}
              onChange={e => set('addressDetail', e.target.value)}
              id="patient-address-detail-input"
            />
          </div>

          {/* Contacto */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Contacto</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Teléfono 1</label>
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
              <label className="form-label">Teléfono 2</label>
              <input
                className="form-input"
                placeholder="300 000 0000"
                value={form.phone2}
                onChange={e => set('phone2', e.target.value)}
                type="tel"
                id="patient-phone2-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              className="form-input"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              type="email"
              id="patient-email-input"
            />
          </div>

          {/* Clínico */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Datos clínicos</p>
          <div className="form-group">
            <label className="form-label">Grupo sanguíneo</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {BLOOD_TYPES.map(bt => (
                <button
                  key={bt}
                  type="button"
                  className="btn btn-sm"
                  style={{
                    borderRadius: 999,
                    border: `1.5px solid ${form.bloodType === bt ? 'var(--primary)' : 'var(--border)'}`,
                    background: form.bloodType === bt ? 'var(--primary)' : 'var(--surface-2)',
                    color: form.bloodType === bt ? '#fff' : 'var(--text-muted)',
                    fontWeight: form.bloodType === bt ? 700 : 400,
                    minWidth: 42,
                  }}
                  onClick={() => set('bloodType', form.bloodType === bt ? '' : bt)}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Acompañante */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Acompañante / Cuidador</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                placeholder="Nombre del acompañante"
                value={form.companion}
                onChange={e => set('companion', e.target.value)}
                id="patient-companion-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parentesco</label>
              <input
                className="form-input"
                placeholder="Hijo/a, cónyuge, cuidador..."
                value={form.companionRelation}
                onChange={e => set('companionRelation', e.target.value)}
                id="patient-companion-rel-input"
              />
            </div>
          </div>

          {/* Visita */}
          <p className="section-label" style={{ margin: '4px 0 2px' }}>Configuración de visita</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
            <label className="form-label">Notas generales</label>
            <textarea
              className="form-input"
              placeholder="Indicaciones especiales, precauciones, diagnóstico principal..."
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

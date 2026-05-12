import { useState, useEffect } from 'react'
import { useVisits } from '../context/VisitsContext.jsx'
import { usePatients } from '../context/PatientsContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const CONDITIONS = [
  {
    value: 'mejoria_funcional',
    label: 'Mejoría funcional',
    emoji: '📈',
    tooltip: 'Ganancia objetiva en ROM, fuerza muscular o funcionalidad respecto a la sesión anterior',
    color: '#10b981',
  },
  {
    value: 'sin_cambios',
    label: 'Sin cambios',
    emoji: '➡️',
    tooltip: 'Evolución sin variaciones respecto a la sesión anterior',
    color: '#64748b',
  },
  {
    value: 'estacionario',
    label: 'Estacionario',
    emoji: '⏸️',
    tooltip: 'Proceso terapéutico estable, sin progresión ni regresión clínica observable',
    color: '#0891b2',
  },
  {
    value: 'post_agudo',
    label: 'Post-agudo',
    emoji: '🔶',
    tooltip: 'Paciente en fase post-aguda con limitación funcional activa, requiere manejo progresivo',
    color: '#f59e0b',
  },
  {
    value: 'dolor_agudizado',
    label: 'Dolor agudizado',
    emoji: '🔴',
    tooltip: 'Exacerbación del cuadro álgico por encima del valor basal reportado',
    color: '#ef4444',
  },
  {
    value: 'regresion',
    label: 'Regresión',
    emoji: '📉',
    tooltip: 'Retroceso en los logros terapéuticos alcanzados en sesiones previas',
    color: '#dc2626',
  },
]

const COND_LABEL = Object.fromEntries(CONDITIONS.map(c => [c.value, c.label]))

const nowTimeStr = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const timeToISO = (timeStr, visitDate) => {
  if (!timeStr) return null
  const base = visitDate || todayStr()
  return new Date(`${base}T${timeStr}:00`).toISOString()
}

const isoToTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function generateEvolutionText({ patientName, arrivedAtTime, departedAtTime, attendance, patientCondition, conditionNotes, treatmentDone, companion, companionRelation }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const fmtT = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const d = new Date()
    d.setHours(+h, +m, 0)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const durationMins = arrivedAtTime && departedAtTime ? (() => {
    const [ah, am] = arrivedAtTime.split(':').map(Number)
    const [dh, dm] = departedAtTime.split(':').map(Number)
    const diff = (dh * 60 + dm) - (ah * 60 + am)
    return diff > 0 ? diff : null
  })() : null

  const attendLabels = {
    presente: 'Presente y colaborador',
    ausente: 'Ausente',
    no_colabora: 'Presente — No colabora',
  }

  const SEP = '─'.repeat(36)
  let text = `EVOLUCIÓN FISIOTERAPÉUTICA\n${SEP}\n`
  text += `Fecha: ${dateStr}\nPaciente: ${patientName}\n`

  const timeParts = []
  if (arrivedAtTime) timeParts.push(`Llegada: ${fmtT(arrivedAtTime)}`)
  if (departedAtTime) timeParts.push(`Salida: ${fmtT(departedAtTime)}`)
  if (durationMins) timeParts.push(`Duración: ${durationMins} min`)
  if (timeParts.length) text += timeParts.join(' | ') + '\n'

  text += `\nAsistencia: ${attendLabels[attendance] || attendance}\n`
  if (companion) {
    const relStr = companionRelation ? ` (${companionRelation})` : ''
    text += `Acompañante: ${companion}${relStr}\n`
  }

  if (attendance === 'ausente') {
    if (conditionNotes) text += `\nObservaciones:\n${conditionNotes}\n`
    text += `\n${SEP}`
    return text.trim()
  }

  if (patientCondition) text += `Estado clínico: ${COND_LABEL[patientCondition] || patientCondition}\n`
  if (conditionNotes) text += `\nObservaciones clínicas:\n${conditionNotes}\n`
  if (treatmentDone) text += `\nIntervención realizada:\n${treatmentDone}\n`

  text += `\n${SEP}`
  return text.trim()
}

export default function VisitModal({ patientId, patientName, existingVisit, onClose, onSaved }) {
  const { upsertVisit } = useVisits()
  const { patients } = usePatients()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [improving, setImproving] = useState(null) // 'observaciones' | 'intervencion'

  // Get full patient data for companion info
  const patient = patients.find(p => p.id === patientId)

  const [attendance, setAttendance] = useState(existingVisit?.attendance ?? 'presente')
  const [arrivedAtTime, setArrivedAtTime] = useState(
    existingVisit?.arrivedAt ? isoToTime(existingVisit.arrivedAt) : nowTimeStr()
  )
  const [departedAtTime, setDepartedAtTime] = useState(
    existingVisit?.departedAt ? isoToTime(existingVisit.departedAt) : ''
  )
  const [patientCondition, setPatientCondition] = useState(existingVisit?.patientCondition ?? null)
  const [conditionNotes, setConditionNotes] = useState(existingVisit?.conditionNotes ?? '')
  const [treatmentDone, setTreatmentDone] = useState(existingVisit?.treatmentDone ?? '')
  const [evolutionText, setEvolutionText] = useState(existingVisit?.evolutionText ?? '')
  const [textEdited, setTextEdited] = useState(false)

  // Auto-regenerate evolution text when fields change
  useEffect(() => {
    if (textEdited) return
    setEvolutionText(generateEvolutionText({
      patientName, arrivedAtTime, departedAtTime, attendance, patientCondition, conditionNotes, treatmentDone,
      companion: patient?.companion || '',
      companionRelation: patient?.companionRelation || '',
    }))
  }, [patientName, arrivedAtTime, departedAtTime, attendance, patientCondition, conditionNotes, treatmentDone, textEdited, patient])

  const handleImprove = async (fieldType) => {
    const text = fieldType === 'intervencion' ? treatmentDone : conditionNotes
    if (!text?.trim()) { toast.error('Escribe algo primero para mejorar'); return }
    setImproving(fieldType)
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fieldType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      if (fieldType === 'intervencion') {
        setTreatmentDone(data.improved)
      } else {
        setConditionNotes(data.improved)
      }
      toast.success('✨ Redacción mejorada')
    } catch (e) {
      toast.error('Error IA: ' + e.message)
    }
    setImproving(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const vDate = existingVisit?.visitDate || todayStr()
      const saved = await upsertVisit({
        id: existingVisit?.id,
        patientId,
        visitDate: vDate,
        arrivedAt: timeToISO(arrivedAtTime, vDate),
        departedAt: departedAtTime ? timeToISO(departedAtTime, vDate) : null,
        attendance,
        patientCondition,
        conditionNotes,
        treatmentDone,
        evolutionText,
      })
      toast.success('Visita guardada ✓')
      onSaved?.(saved)
      onClose()
    } catch (e) {
      toast.error('Error al guardar: ' + e.message)
    }
    setSaving(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(evolutionText)
      toast.success('¡Evolución copiada! Pega en la plataforma 📋')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '92dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="drag-handle"><span /></div>

        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 0 }}>
          <div>
            <h3 className="modal-title">📋 Registrar visita</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Attendance */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Asistencia del paciente</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { v: 'presente', label: '✅ Presente', color: '#10b981' },
              { v: 'ausente', label: '❌ Ausente', color: '#ef4444' },
              { v: 'no_colabora', label: '⚠️ No colabora', color: '#f59e0b' },
            ].map(opt => (
              <button
                key={opt.v}
                className="btn btn-sm"
                style={{
                  background: attendance === opt.v ? opt.color : 'var(--surface-2)',
                  color: attendance === opt.v ? '#fff' : 'var(--text-muted)',
                  border: `1.5px solid ${attendance === opt.v ? opt.color : 'var(--border)'}`,
                  borderRadius: 999,
                  fontWeight: attendance === opt.v ? 600 : 400,
                }}
                onClick={() => setAttendance(opt.v)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Times */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hora llegada</label>
            <input className="form-input" type="time" value={arrivedAtTime} onChange={e => setArrivedAtTime(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hora salida</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="form-input"
                type="time"
                value={departedAtTime}
                onChange={e => setDepartedAtTime(e.target.value)}
                style={{ flex: 1 }}
              />
              {!departedAtTime && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setDepartedAtTime(nowTimeStr())}
                  title="Marcar salida ahora"
                  style={{ flexShrink: 0, fontSize: '0.72rem' }}
                >
                  Ahora
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Condition chips — only if not absent */}
        {attendance !== 'ausente' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Estado clínico del paciente
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                (pasa el cursor para ver descripción)
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {CONDITIONS.map(c => (
                <button
                  key={c.value}
                  className="condition-chip"
                  title={c.tooltip}
                  data-active={patientCondition === c.value ? 'true' : 'false'}
                  style={patientCondition === c.value ? {
                    borderColor: c.color,
                    background: `${c.color}18`,
                    color: c.color,
                    fontWeight: 600,
                  } : {}}
                  onClick={() => setPatientCondition(patientCondition === c.value ? null : c.value)}
                >
                  <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <span className="condition-chip-hint">ⓘ</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ margin: 0 }}>
              {attendance === 'ausente' ? 'Observaciones / Motivo' : 'Observaciones clínicas'}
            </label>
            {attendance !== 'ausente' && (
              <button
                className="btn btn-sm"
                style={{ fontSize: '0.72rem', borderRadius: 999, background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', border: 'none', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleImprove('observaciones')}
                disabled={improving !== null}
                title="Mejorar redacción con IA"
              >
                {improving === 'observaciones'
                  ? <><span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Mejorando...</>
                  : '✨ Mejorar con IA'}
              </button>
            )}
          </div>
          <textarea
            className="form-input"
            rows={3}
            placeholder={
              attendance === 'ausente'
                ? 'Motivo de ausencia, intentos de contacto, información de familiares...'
                : 'Estado general, escala de dolor (EVA), limitaciones observadas, tolerancia al esfuerzo...'
            }
            value={conditionNotes}
            onChange={e => setConditionNotes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Treatment done — only if present */}
        {attendance !== 'ausente' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Intervención realizada</label>
              <button
                className="btn btn-sm"
                style={{ fontSize: '0.72rem', borderRadius: 999, background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', border: 'none', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => handleImprove('intervencion')}
                disabled={improving !== null}
                title="Mejorar redacción con IA"
              >
                {improving === 'intervencion'
                  ? <><span className="spinner" style={{ width: 12, height: 12, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Mejorando...</>
                  : '✨ Mejorar con IA'}
              </button>
            </div>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Técnicas aplicadas (FNP, Bobath, kinesiotaping...), ejercicios, educación terapéutica al paciente/familia..."
              value={treatmentDone}
              onChange={e => setTreatmentDone(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        )}

        {/* Evolution text preview */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ margin: 0 }}>Texto de evolución</label>
            {textEdited && (
              <button
                style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                onClick={() => setTextEdited(false)}
              >
                ↩ Regenerar automático
              </button>
            )}
          </div>
          <textarea
            className="form-input"
            rows={9}
            value={evolutionText}
            onChange={e => { setEvolutionText(e.target.value); setTextEdited(true) }}
            style={{ fontFamily: 'monospace', fontSize: '0.76rem', resize: 'vertical', background: 'var(--surface-2)', lineHeight: 1.55 }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
            💡 Se genera automáticamente. Puedes editarlo antes de copiar.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <button className="btn btn-outline" onClick={handleCopy} disabled={!evolutionText}>
            📋 Copiar texto
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '💾 Guardar visita'}
          </button>
        </div>
      </div>
    </div>
  )
}

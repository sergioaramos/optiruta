import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'

export const CONDITION_LABELS = {
  sin_cambios: 'Sin cambios',
  mejoria_funcional: 'Mejoría funcional',
  estacionario: 'Estacionario',
  dolor_agudizado: 'Dolor agudizado',
  regresion: 'Regresión',
  post_agudo: 'Post-agudo',
}

export const ATTENDANCE_LABELS = {
  presente: 'Presente y colaborador',
  ausente: 'Ausente',
  no_colabora: 'Presente — No colabora',
}

function toLocal(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patients?.name ?? '',
    visitDate: row.visit_date,
    arrivedAt: row.arrived_at,
    departedAt: row.departed_at,
    attendance: row.attendance ?? 'presente',
    patientCondition: row.patient_condition ?? null,
    conditionNotes: row.condition_notes ?? '',
    treatmentDone: row.treatment_done ?? '',
    evolutionText: row.evolution_text ?? '',
    createdAt: row.created_at,
  }
}

function toRow(data, userId) {
  return {
    user_id: userId,
    patient_id: data.patientId,
    visit_date: data.visitDate || todayLocal(),
    arrived_at: data.arrivedAt || null,
    departed_at: data.departedAt || null,
    attendance: data.attendance || 'presente',
    patient_condition: data.patientCondition || null,
    condition_notes: data.conditionNotes || null,
    treatment_done: data.treatmentDone || null,
    evolution_text: data.evolutionText || null,
    updated_at: new Date().toISOString(),
  }
}

export function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const VisitsContext = createContext(null)

export function VisitsProvider({ children }) {
  const { user } = useAuth()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchVisits = useCallback(async ({ date, patientId } = {}) => {
    if (!user) return []
    setLoading(true)
    let q = supabase
      .from('visits')
      .select('*, patients(name)')
      .eq('user_id', user.id)
      .order('visit_date', { ascending: false })
      .order('arrived_at', { ascending: true })
    if (date) q = q.eq('visit_date', date)
    if (patientId) q = q.eq('patient_id', patientId)
    const { data, error } = await q
    const result = error ? [] : (data || []).map(toLocal)
    setVisits(result)
    setLoading(false)
    return result
  }, [user])

  const upsertVisit = useCallback(async (visitData) => {
    if (!user) throw new Error('No autenticado')
    const row = toRow(visitData, user.id)
    if (visitData.id) {
      const { data, error } = await supabase
        .from('visits')
        .update(row)
        .eq('id', visitData.id)
        .select('*, patients(name)')
        .single()
      if (error) throw error
      const updated = toLocal(data)
      setVisits(v => v.map(x => x.id === visitData.id ? updated : x))
      return updated
    } else {
      const { data, error } = await supabase
        .from('visits')
        .insert(row)
        .select('*, patients(name)')
        .single()
      if (error) throw error
      const created = toLocal(data)
      setVisits(v => [created, ...v])
      return created
    }
  }, [user])

  const deleteVisit = useCallback(async (id) => {
    const { error } = await supabase.from('visits').delete().eq('id', id)
    if (error) throw error
    setVisits(v => v.filter(x => x.id !== id))
  }, [])

  return (
    <VisitsContext.Provider value={{ visits, loading, fetchVisits, upsertVisit, deleteVisit }}>
      {children}
    </VisitsContext.Provider>
  )
}

export function useVisits() {
  const ctx = useContext(VisitsContext)
  if (!ctx) throw new Error('useVisits must be used within VisitsProvider')
  return ctx
}

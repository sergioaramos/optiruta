import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { getPatients as getLocalPatients } from '../modules/storage.js'

const PatientsContext = createContext(null)

// Convierte snake_case de Supabase a camelCase local
function toLocal(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    addressDetail: row.address_detail ?? '',
    phone: row.phone ?? '',
    phone2: row.phone2 ?? '',
    email: row.email ?? '',
    document: row.document ?? '',
    birthDate: row.birth_date ?? '',
    bloodType: row.blood_type ?? '',
    companion: row.companion ?? '',
    companionRelation: row.companion_relation ?? '',
    notes: row.notes ?? '',
    visitDuration: row.visit_duration ?? 20,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    createdAt: row.created_at,
  }
}

// Convierte camelCase local a snake_case para Supabase
function toRow(data, userId) {
  return {
    user_id: userId,
    name: data.name,
    address: data.address,
    address_detail: data.addressDetail ?? '',
    phone: data.phone ?? '',
    phone2: data.phone2 ?? '',
    email: data.email ?? '',
    document: data.document ?? '',
    birth_date: data.birthDate || null,
    blood_type: data.bloodType ?? '',
    companion: data.companion ?? '',
    companion_relation: data.companionRelation ?? '',
    notes: data.notes ?? '',
    visit_duration: data.visitDuration ?? 20,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  }
}

const MIGRATION_KEY = 'optiruta_migrated_to_supabase'

export function PatientsProvider({ children }) {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPatients = useCallback(async () => {
    if (!user) { setPatients([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setPatients((data || []).map(toLocal))
    setLoading(false)
  }, [user])

  // Migración única desde localStorage
  useEffect(() => {
    if (!user) return
    const migrated = localStorage.getItem(MIGRATION_KEY)
    if (migrated) return
    const local = getLocalPatients()
    if (local.length === 0) { localStorage.setItem(MIGRATION_KEY, '1'); return }
    const rows = local.map(p => toRow(p, user.id))
    supabase.from('patients').insert(rows).then(({ error }) => {
      if (!error) {
        localStorage.setItem(MIGRATION_KEY, '1')
        fetchPatients()
      }
    })
  }, [user, fetchPatients])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const add = async (data) => {
    const { data: row, error } = await supabase
      .from('patients')
      .insert(toRow(data, user.id))
      .select()
      .single()
    if (error) throw error
    const p = toLocal(row)
    setPatients(prev => [p, ...prev])
    return p
  }

  const update = async (id, data) => {
    const { error } = await supabase
      .from('patients')
      .update({ ...toRow(data, user.id), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  const remove = async (id) => {
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) throw error
    setPatients(prev => prev.filter(p => p.id !== id))
  }

  return (
    <PatientsContext.Provider value={{ patients, loading, add, update, remove, refresh: fetchPatients }}>
      {children}
    </PatientsContext.Provider>
  )
}

export function usePatients() {
  return useContext(PatientsContext)
}

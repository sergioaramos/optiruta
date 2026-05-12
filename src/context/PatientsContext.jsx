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
    phone: row.phone ?? '',
    notes: row.notes ?? '',
    visitDuration: row.visit_duration ?? 20,
    createdAt: row.created_at,
  }
}

// Convierte camelCase local a snake_case para Supabase
function toRow(data, userId) {
  return {
    user_id: userId,
    name: data.name,
    address: data.address,
    phone: data.phone ?? '',
    notes: data.notes ?? '',
    visit_duration: data.visitDuration ?? 20,
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

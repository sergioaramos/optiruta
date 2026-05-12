import { createContext, useContext, useState, useEffect } from 'react'
import { getPatients, savePatients, addPatient, updatePatient, deletePatient } from '../modules/storage.js'

const PatientsContext = createContext(null)

export function PatientsProvider({ children }) {
  const [patients, setPatients] = useState([])

  useEffect(() => {
    setPatients(getPatients())
  }, [])

  const refresh = () => setPatients(getPatients())

  const add = (data) => {
    const p = addPatient(data)
    refresh()
    return p
  }

  const update = (id, data) => {
    updatePatient(id, data)
    refresh()
  }

  const remove = (id) => {
    deletePatient(id)
    refresh()
  }

  return (
    <PatientsContext.Provider value={{ patients, add, update, remove, refresh }}>
      {children}
    </PatientsContext.Provider>
  )
}

export function usePatients() {
  return useContext(PatientsContext)
}

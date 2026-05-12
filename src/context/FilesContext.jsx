import { createContext, useContext, useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabase.js'

// ─── Limits ────────────────────────────────────────────────────
const BUCKET = 'visit-files'
const MAX_FILES_PER_VISIT = 5
const MAX_FILE_SIZE_MB = 1          // after compression
const STORAGE_WARN_BYTES = 800 * 1024 * 1024   // 800 MB → advertir
const STORAGE_BLOCK_BYTES = 950 * 1024 * 1024  // 950 MB → bloquear
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

const FilesContext = createContext(null)
export const useFiles = () => useContext(FilesContext)

// ─── Helpers ────────────────────────────────────────────────────
async function getUsedBytes(userId) {
  const { data, error } = await supabase
    .from('visit_files')
    .select('file_size')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).reduce((sum, r) => sum + (r.file_size || 0), 0)
}

async function compressIfImage(file) {
  if (!file.type.startsWith('image/')) return file
  return imageCompression(file, {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
  })
}

// ─── Provider ───────────────────────────────────────────────────
export function FilesProvider({ children }) {

  /** Obtener archivos de una visita */
  const fetchFiles = useCallback(async (visitId) => {
    const { data, error } = await supabase
      .from('visit_files')
      .select('*')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }, [])

  /** Subir un archivo a una visita */
  const uploadFile = useCallback(async (visitId, file) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo imágenes y PDF.')
    }

    // Verificar límite de archivos por visita
    const existing = await fetchFiles(visitId)
    if (existing.length >= MAX_FILES_PER_VISIT) {
      throw new Error(`Máximo ${MAX_FILES_PER_VISIT} archivos por visita.`)
    }

    // Verificar espacio disponible
    const usedBytes = await getUsedBytes(user.id)
    if (usedBytes >= STORAGE_BLOCK_BYTES) {
      throw new Error('Almacenamiento lleno (95%). Elimina archivos antes de subir más.')
    }

    // Comprimir si es imagen
    const toUpload = await compressIfImage(file)
    const finalSize = toUpload.size

    if (usedBytes + finalSize > STORAGE_BLOCK_BYTES) {
      throw new Error('Este archivo supera el espacio disponible.')
    }

    // Construir path único
    const ext = file.type === 'application/pdf' ? 'pdf' : 'webp'
    const fileName = `${Date.now()}.${ext}`
    const filePath = `${user.id}/${visitId}/${fileName}`

    // Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, toUpload, { contentType: toUpload.type, upsert: false })
    if (uploadError) throw uploadError

    // Registrar en tabla visit_files
    const { data, error: dbError } = await supabase
      .from('visit_files')
      .insert({
        visit_id: visitId,
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: finalSize,
        mime_type: toUpload.type,
      })
      .select()
      .single()
    if (dbError) {
      // Rollback storage
      await supabase.storage.from(BUCKET).remove([filePath])
      throw dbError
    }

    // Advertir si se acerca al límite
    const newUsed = usedBytes + finalSize
    if (newUsed >= STORAGE_WARN_BYTES) {
      console.warn(`Almacenamiento al ${Math.round(newUsed / 1024 / 1024)}MB de 1024MB`)
    }

    return data
  }, [fetchFiles])

  /** Eliminar un archivo */
  const deleteFile = useCallback(async (fileRecord) => {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([fileRecord.file_path])
    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('visit_files')
      .delete()
      .eq('id', fileRecord.id)
    if (dbError) throw dbError
  }, [])

  /** URL firmada para ver un archivo privado (válida 60 min) */
  const getSignedUrl = useCallback(async (filePath) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600)
    if (error) throw error
    return data.signedUrl
  }, [])

  /** Estadísticas de uso */
  const getStorageStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { usedBytes: 0, usedMB: 0, percent: 0, warn: false }
    const usedBytes = await getUsedBytes(user.id)
    return {
      usedBytes,
      usedMB: Math.round(usedBytes / 1024 / 1024),
      percent: Math.round((usedBytes / (1024 * 1024 * 1024)) * 100),
      warn: usedBytes >= STORAGE_WARN_BYTES,
      blocked: usedBytes >= STORAGE_BLOCK_BYTES,
    }
  }, [])

  return (
    <FilesContext.Provider value={{ fetchFiles, uploadFile, deleteFile, getSignedUrl, getStorageStats }}>
      {children}
    </FilesContext.Provider>
  )
}

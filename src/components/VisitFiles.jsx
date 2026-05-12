import { useState, useEffect, useRef } from 'react'
import { useFiles } from '../context/FilesContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const MAX_FILES = 5

function FileThumb({ file, onDelete }) {
  const { getSignedUrl } = useFiles()
  const [url, setUrl] = useState(null)
  const isPdf = file.mime_type === 'application/pdf'

  useEffect(() => {
    getSignedUrl(file.file_path).then(setUrl).catch(() => {})
  }, [file.file_path, getSignedUrl])

  return (
    <div style={{
      position: 'relative',
      width: 72,
      height: 72,
      borderRadius: 10,
      overflow: 'hidden',
      border: '1.5px solid var(--border)',
      background: 'var(--surface-2)',
      flexShrink: 0,
    }}>
      {isPdf ? (
        <a href={url} target="_blank" rel="noreferrer"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textDecoration: 'none', color: '#dc2626', gap: 2 }}>
          <span style={{ fontSize: '1.6rem' }}>📄</span>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>
            {file.file_name.slice(0, 12)}
          </span>
        </a>
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={file.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </a>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      )}
      {/* Delete button */}
      <button
        onClick={() => onDelete(file)}
        style={{
          position: 'absolute', top: 2, right: 2,
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}
        title="Eliminar archivo"
      >✕</button>
      {/* Size badge */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.45)', color: '#fff',
        fontSize: '0.55rem', textAlign: 'center', padding: '1px 0',
      }}>
        {(file.file_size / 1024).toFixed(0)}KB
      </div>
    </div>
  )
}

export default function VisitFiles({ visitId, readOnly = false }) {
  const { fetchFiles, uploadFile, deleteFile } = useFiles()
  const toast = useToast()
  const inputRef = useRef()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(true)

  const load = async () => {
    if (!visitId) { setLoadingFiles(false); return }
    try {
      setLoadingFiles(true)
      const data = await fetchFiles(visitId)
      setFiles(data)
    } catch (e) {
      toast.error('Error al cargar archivos')
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => { load() }, [visitId])

  const handlePick = () => inputRef.current?.click()

  const handleChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !visitId) return

    if (files.length >= MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos por visita`)
      return
    }

    setUploading(true)
    try {
      toast.info?.('📎 Subiendo archivo...')
      const newFile = await uploadFile(visitId, file)
      setFiles(prev => [...prev, newFile])
      toast.success('Archivo subido ✓')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileRecord) => {
    try {
      await deleteFile(fileRecord)
      setFiles(prev => prev.filter(f => f.id !== fileRecord.id))
      toast.success('Archivo eliminado')
    } catch (e) {
      toast.error('Error al eliminar: ' + e.message)
    }
  }

  if (!visitId) {
    return (
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
        💾 Guarda la visita primero para adjuntar archivos.
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="form-label" style={{ margin: 0 }}>
          📎 Archivos adjuntos
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
            ({files.length}/{MAX_FILES} · max 1MB c/u · imágenes y PDF)
          </span>
        </label>
        {!readOnly && files.length < MAX_FILES && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={handlePick}
            disabled={uploading}
            style={{ fontSize: '0.72rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {uploading
              ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Subiendo...</>
              : '+ Agregar'}
          </button>
        )}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {/* Thumbnails */}
      {loadingFiles ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <span className="spinner" style={{ width: 16, height: 16 }} /> Cargando...
        </div>
      ) : files.length === 0 ? (
        !readOnly && (
          <button
            onClick={handlePick}
            disabled={uploading}
            style={{
              width: '100%', padding: '14px', border: '2px dashed var(--border)',
              borderRadius: 10, background: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            📷 Toca para agregar foto o PDF
          </button>
        )
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {files.map(f => (
            <FileThumb key={f.id} file={f} onDelete={readOnly ? () => {} : handleDelete} />
          ))}
          {!readOnly && files.length < MAX_FILES && (
            <button
              onClick={handlePick}
              disabled={uploading}
              style={{
                width: 72, height: 72, borderRadius: 10, border: '2px dashed var(--border)',
                background: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
              title="Agregar archivo"
            >+</button>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'

// Manizales center — biases search results toward the city
const BIAS = { lat: 5.0703, lon: -75.5138 }

function buildLabel(f) {
  const p = f.properties
  const parts = [
    p.name,
    p.street && p.housenumber ? `${p.street} ${p.housenumber}` : (p.street || null),
    p.district || p.suburb,
    p.city || p.town || p.village,
  ].filter(Boolean)
  return [...new Set(parts)].join(', ')
}

/**
 * AddressAutocomplete
 * Props:
 *  value       — current address string
 *  onChange    — (addressString) => void  — called on every keystroke
 *  onSelect    — ({ address, lat, lng }) => void  — called when user picks a suggestion
 *  placeholder — string
 *  id          — input id
 */
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, id }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const hasCoords = useRef(false)

  // Sync if parent resets the value
  useEffect(() => { setQuery(value || '') }, [value])

  const search = async (q) => {
    if (q.length < 4) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: `${q} Manizales`,
        lat: BIAS.lat,
        lon: BIAS.lon,
        limit: 6,
        lang: 'es',
      })
      const res = await fetch(`https://photon.komoot.io/api/?${params}`)
      const data = await res.json()
      const items = (data.features || [])
        .map(f => ({
          label: buildLabel(f),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }))
        .filter(i => i.label)
      setSuggestions(items)
      setOpen(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    onChange(q)
    hasCoords.current = false
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 380)
  }

  const handleSelect = (item) => {
    setQuery(item.label)
    onChange(item.label)
    onSelect({ address: item.label, lat: item.lat, lng: item.lng })
    setSuggestions([])
    setOpen(false)
    hasCoords.current = true
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="form-input-icon">
        <span className="input-icon">{loading ? '⏳' : '📍'}</span>
        <input
          id={id}
          className="form-input"
          placeholder={placeholder || 'Ej: Calle 72 # 27-114, Manizales'}
          value={query}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={() => suggestions.length > 0 && !hasCoords.current && setOpen(true)}
          autoComplete="off"
        />
      </div>

      {/* Hint */}
      {!hasCoords.current && query.length > 0 && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
          💡 Escribe y selecciona una sugerencia para guardar la ubicación exacta
        </p>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxHeight: 240, overflowY: 'auto', marginTop: 2,
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(s)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: '0.83rem',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span style={{ marginTop: 1 }}>📍</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

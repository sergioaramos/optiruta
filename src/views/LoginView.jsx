import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { PERSONAL_MODE, personal } from '../config/personal.js'

export default function LoginView() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmail = async (e) => {
    e.preventDefault()
    if (!email.trim() || password.length < 6) {
      toast.error('Email válido y contraseña de mínimo 6 caracteres')
      return
    }
    setLoading(true)
    const fn = mode === 'login' ? signInWithEmail : signUpWithEmail
    const { error } = await fn(email.trim(), password)
    setLoading(false)
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message)
    } else if (mode === 'register') {
      toast.success('¡Cuenta creada! Revisa tu email para confirmar.')
    }
  }

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error('Error al iniciar con Google')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>🚀</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>OptiRuta</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {PERSONAL_MODE ? `Bienvenida, ${personal.nickname} 💖` : 'Optimiza tu ruta de visitas'}
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20, textAlign: 'center' }}>
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>

        {/* Google */}
        <button
          className="btn btn-secondary btn-full"
          onClick={handleGoogle}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={20} alt="Google" />
          Continuar con Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>o con email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            className="btn btn-ghost"
            style={{ padding: '0 4px', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}

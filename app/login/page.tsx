'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import styles from '../auth.module.css'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/contactos'
  const registered = searchParams.get('registered')
  /** NextAuth redirige aquí con ?error= desde pages.error */
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })
      if (res?.error) {
        setError('Email o contraseña incorrectos.')
        setLoading(false)
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('No se pudo iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.lead}>
          Accedé a Contactos y a tu perfil. El panel principal de pisos sigue siendo visible para todos los usuarios.
        </p>
        {registered ? (
          <p className={styles.lead} style={{ color: 'hsl(var(--muted-foreground))' }}>
            Cuenta creada. Iniciá sesión con tu email y contraseña.
          </p>
        ) : null}
        {oauthError ? (
          <div className={styles.error} role="alert">
            {oauthError === 'Configuration'
              ? 'Error de configuración del servidor (sesiones). Si sos la administradora, revisá NEXTAUTH_SECRET y NEXTAUTH_URL en Vercel.'
              : oauthError === 'AccessDenied'
                ? 'Acceso denegado.'
                : 'No se pudo completar el inicio de sesión. Probá de nuevo.'}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            <Link href="/register" className={styles.link}>
              Crear cuenta
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.wrap}>Cargando…</div>}>
      <LoginForm />
    </Suspense>
  )
}

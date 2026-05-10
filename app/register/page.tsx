'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from '../auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'No se pudo registrar')
        setLoading(false)
        return
      }
      router.push('/login?registered=1')
      router.refresh()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Crear cuenta</h1>
        <p className={styles.lead}>Registrate para usar Contactos con datos solo tuyos.</p>
        <form onSubmit={handleSubmit}>
          {error ? <div className={styles.error}>{error}</div> : null}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-name">
              Nombre (opcional)
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
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
            <label className={styles.label} htmlFor="reg-password">
              Contraseña (mín. 8 caracteres)
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Creando…' : 'Registrarme'}
            </button>
            <Link href="/login" className={styles.link}>
              Ya tengo cuenta
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from '../auth.module.css'

export default function PerfilPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/perfil')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.user?.name) setName(j.user.name)
      })
      .catch(() => {})
  }, [status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)
    try {
      const body: Record<string, string> = {}
      if (name.trim()) body.name = name.trim()
      if (newPassword) {
        body.newPassword = newPassword
        body.currentPassword = currentPassword
      }
      if (Object.keys(body).length === 0) {
        setError('No hay cambios.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'No se pudo guardar')
        setLoading(false)
        return
      }
      setMessage('Cambios guardados.')
      setCurrentPassword('')
      setNewPassword('')
      router.refresh()
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.wrap}>
        <p className={styles.linkMuted}>Cargando sesión…</p>
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Perfil</h1>
        <p className={styles.lead}>
          Email: <strong>{session.user.email}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          {error ? <div className={styles.error}>{error}</div> : null}
          {message ? (
            <p className={styles.lead} style={{ color: 'hsl(142 76% 36%)' }}>
              {message}
            </p>
          ) : null}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="perfil-name">
              Nombre para mostrar
            </label>
            <input
              id="perfil-name"
              name="name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <p className={styles.lead}>Cambiar contraseña (opcional)</p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="perfil-current">
              Contraseña actual
            </label>
            <input
              id="perfil-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="perfil-new">
              Nueva contraseña (mín. 8 caracteres)
            </label>
            <input
              id="perfil-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

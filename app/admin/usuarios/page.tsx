'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from './page.module.css'

type Row = {
  id: number
  email: string
  name: string | null
  role: 'user' | 'admin'
  createdAt: string
  lastLoginAt: string | null
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminUsuariosPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'No se pudo cargar')
        setRows([])
        return
      }
      setRows(json.data)
    } catch {
      setError('Error de red')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeRole = async (id: number, role: 'user' | 'admin') => {
    setSavingId(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'No se pudo guardar')
        return
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role: json.data.role } : r)))
    } catch {
      setError('Error de red')
    } finally {
      setSavingId(null)
    }
  }

  const resetForm = () => {
    setFormEmail('')
    setFormName('')
    setFormPassword('')
    setFormRole('user')
    setFormError('')
    setFormSuccess('')
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail.trim().toLowerCase(),
          name: formName.trim(),
          password: formPassword,
          role: formRole,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setFormError(json.error || 'No se pudo crear')
        return
      }
      setRows((prev) => [...prev, json.data])
      setFormSuccess(`Usuario ${json.data.email} creado correctamente`)
      setFormEmail('')
      setFormName('')
      setFormPassword('')
      setFormRole('user')
    } catch {
      setFormError('Error de red')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Gestión de usuarios</h1>
            <p className={styles.lead}>
              Solo visible para administradores. Cambiá el rol entre usuario y administrador.
            </p>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => { setShowForm(!showForm); resetForm() }}
          >
            {showForm ? 'Cancelar' : '+ Añadir usuario'}
          </button>
        </div>
      </header>

      {showForm && (
        <form className={styles.form} onSubmit={handleCreateUser}>
          <h2 className={styles.formTitle}>Nuevo usuario</h2>
          {formError && <p className={styles.error}>{formError}</p>}
          {formSuccess && <p className={styles.success}>{formSuccess}</p>}
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-email">Email *</label>
              <input
                id="new-email"
                type="email"
                required
                className={styles.input}
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-name">Nombre</label>
              <input
                id="new-name"
                type="text"
                className={styles.input}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nombre (opcional)"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-password">Contraseña *</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                className={styles.input}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-role">Rol</label>
              <select
                id="new-role"
                className={styles.select}
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as 'user' | 'admin')}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={formLoading}>
            {formLoading ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p className={styles.loading}>Cargando…</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Último acceso</th>
                <th className={styles.th}>Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.td}>{row.email}</td>
                  <td className={styles.td}>{row.name || '—'}</td>
                  <td className={styles.td}>
                    <select
                      className={styles.select}
                      value={row.role}
                      disabled={savingId === row.id}
                      onChange={(e) =>
                        changeRole(row.id, e.target.value as 'user' | 'admin')
                      }
                      aria-label={`Rol de ${row.email}`}
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td className={styles.td}>{formatDateTime(row.lastLoginAt)}</td>
                  <td className={styles.td}>
                    {new Date(row.createdAt).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

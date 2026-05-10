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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gestión de usuarios</h1>
        <p className={styles.lead}>
          Solo visible para administradores. Cambiá el rol entre usuario y administrador.
        </p>
      </header>

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

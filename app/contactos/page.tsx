'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'


/** Horas en bloques de 10 min para el selector de cita (solo 07:00–21:50, no 22h–07h). */
const TIME_SLOTS_10: string[] = []
for (let h = 7; h < 22; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_SLOTS_10.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

interface Listing {
  id: number
  title: string | null
  price: number
  surface: number | null
  link: string
  type: 'alquiler' | 'compra'
  neighborhood: string | null
  city: string | null
  province: string | null
  publishedAddress: string | null
  rooms: number | null
  citaAt: string | null
  contacto: string | null
  phone: string | null
  notas: string | null
  llamado?: boolean
  visitado?: boolean
}

/** Redondea minutos al bloque de 10 min más cercano (:00, :10, :20, :30, :40, :50). */
function roundToTenMinutes(d: Date): Date {
  const mins = d.getMinutes()
  const rounded = Math.round(mins / 10) * 10
  const out = new Date(d)
  if (rounded >= 60) {
    out.setHours(out.getHours() + 1)
    out.setMinutes(0, 0, 0)
  } else {
    out.setMinutes(rounded, 0, 0)
  }
  return out
}

/** Fecha mínima (hoy) para el input date. */
function minDateToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Hora mínima para el selector: si la fecha es hoy, siguiente slot de 10 min (entre 07:00 y 21:50); si no, "07:00". */
function minTimeForDate(dateStr: string): string {
  const today = minDateToday()
  if (!dateStr || dateStr !== today) return '07:00'
  const d = new Date()
  const mins = d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000
  const nextSlot = Math.ceil(mins / 10) * 10
  let h = d.getHours()
  let m = nextSlot
  if (nextSlot >= 60) {
    h += 1
    m = 0
  }
  const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  if (slot < '07:00') return '07:00'
  if (slot > '21:50') return '22:00' // hoy ya no hay slots; el filtro no mostrará opciones
  return slot
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = roundToTenMinutes(new Date(iso))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function formatCita(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  )
}

/** Icono de visitado (pin de ubicación). */
function VisitadoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  )
}

type SortKey = 'publishedAddress' | 'neighborhood' | 'price' | 'citaAt' | 'notas'
type SortDir = 'asc' | 'desc'

export default function ContactosPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBarrio, setSelectedBarrio] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<{
    citaAt: string
    notas: string
  }>({ citaAt: '', notas: '' })
  const [phoneDialogId, setPhoneDialogId] = useState<number | null>(null)
  const [phoneDialogForm, setPhoneDialogForm] = useState<{ phone: string; llamado: boolean }>({ phone: '', llamado: false })
  const [savingPhone, setSavingPhone] = useState(false)
  const [visitadoTogglingId, setVisitadoTogglingId] = useState<number | null>(null)
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<string>('200000') // Por defecto ocultar pisos > 200.000 €

  const loadListings = () => {
    setLoading(true)
    const params = new URLSearchParams({ type: 'compra' })
    if (selectedMaxPrice !== 'all') {
      params.append('maxPrice', selectedMaxPrice)
    }
    fetch(`/api/listings?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setListings(json.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaxPrice])

  const openEdit = (row: Listing) => {
    setEditingId(row.id)
    const citaDate = row.citaAt ? new Date(row.citaAt) : null
    const now = new Date()
    const citaAt =
      citaDate && citaDate >= now ? toDatetimeLocal(row.citaAt) : ''
    setEditForm({
      citaAt,
      notas: row.notas ?? '',
    })
  }

  const closeEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este piso de la lista?')) return
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        if (editingId === id) closeEdit()
        loadListings()
      } else {
        alert(json.error || 'Error al eliminar')
      }
    } catch {
      alert('Error al eliminar')
    }
  }

  const openPhoneDialog = (row: Listing) => {
    setPhoneDialogId(row.id)
    setPhoneDialogForm({
      phone: row.phone ?? '',
      llamado: row.llamado ?? false,
    })
  }

  const closePhoneDialog = () => {
    setPhoneDialogId(null)
  }

  const handleToggleVisitado = async (row: Listing) => {
    const next = !(row.visitado ?? false)
    setVisitadoTogglingId(row.id)
    try {
      const res = await fetch(`/api/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitado: next }),
      })
      const json = await res.json()
      if (json.success) loadListings()
      else alert(json.error || 'Error al guardar')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setVisitadoTogglingId(null)
    }
  }

  const savePhoneDialog = async () => {
    if (phoneDialogId == null) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/listings/${phoneDialogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: (phoneDialogForm.phone?.trim() ?? '') || null,
          llamado: phoneDialogForm.llamado,
        }),
      })
      const json = await res.json()
      if (json.success) {
        closePhoneDialog()
        loadListings()
      } else {
        console.error('[savePhoneDialog] Respuesta de error:', json)
        if (json.errorDetail) console.error('[savePhoneDialog] Detalle:', json.errorDetail)
        alert((json.error || 'Error al guardar') + '\n\n(Abrí la consola (F12 > Console) o Network > PUT > Response para ver el error completo.)')
      }
    } catch (e) {
      console.error('[savePhoneDialog] Excepción:', e)
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingPhone(false)
    }
  }

  const saveEdit = async () => {
    if (editingId == null) return
    setSaving(true)
    try {
      let citaAt: string | null = null
      if (editForm.citaAt && editForm.citaAt.length >= 16) {
        const d = new Date(editForm.citaAt)
        if (!Number.isNaN(d.getTime())) {
          citaAt = roundToTenMinutes(d).toISOString()
        }
      }
      const payload = {
        citaAt,
        notas: (editForm.notas?.trim() ?? '') || null,
      }
      const res = await fetch(`/api/listings/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let json: { success?: boolean; error?: string }
      try {
        json = await res.json()
      } catch {
        json = { success: false, error: res.statusText || 'Error de conexión' }
      }
      if (json.success) {
        closeEdit()
        loadListings()
      } else {
        const err = json.error || res.statusText || 'Error al guardar'
        console.error('PUT /api/listings error:', res.status, err)
        alert(`${err}\n\n(Si habla de "telefono" o "column", ejecutá en la terminal: npm run db:push)`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      console.error('saveEdit exception:', e)
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  // Incluir Madrid y ciudades de la Comunidad de Madrid (Alcalá de Henares, etc.)
  const isMadridArea = (l: Listing) =>
    l.province === 'Madrid' || l.province === 'Alcalá de Henares' || l.city === 'Alcalá de Henares'
  const filteredByProvince = listings.filter(isMadridArea)
  const nowForFilter = Date.now()
  const filteredForTodos = filteredByProvince.filter(
    (l) =>
      !(l.visitado === true) &&
      (!l.citaAt || new Date(l.citaAt).getTime() <= nowForFilter)
  )

  const barrios = Array.from(
    new Set(
      filteredForTodos
        .map((l) => l.neighborhood?.trim())
        .filter((b): b is string => Boolean(b))
    )
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const filteredByBarrio =
    selectedBarrio === null
      ? filteredForTodos
      : filteredForTodos.filter((l) => l.neighborhood === selectedBarrio)

  const searchLower = searchQuery.trim().toLowerCase()
  const searchNum = searchLower ? parseFloat(searchQuery.replace(/[^\d,.]/g, '').replace(',', '.')) : NaN
  const filteredBySearch = searchLower
    ? filteredByBarrio.filter((l) => {
        const addr = (l.publishedAddress || l.title || '').toLowerCase()
        const barrio = (l.neighborhood || '').toLowerCase()
        if (!Number.isNaN(searchNum)) {
          return l.price === searchNum || String(l.price).includes(searchQuery.trim()) || addr.includes(searchLower) || barrio.includes(searchLower)
        }
        return addr.includes(searchLower) || barrio.includes(searchLower)
      })
    : filteredByBarrio

  const sortedListings = sortBy
    ? [...filteredBySearch].sort((a, b) => {
        let va: string | number | null = sortBy === 'publishedAddress' ? (a.publishedAddress || a.title || '') : sortBy === 'neighborhood' ? (a.neighborhood || '') : sortBy === 'price' ? a.price : sortBy === 'citaAt' ? (a.citaAt || '') : (a.notas || '')
        let vb: string | number | null = sortBy === 'publishedAddress' ? (b.publishedAddress || b.title || '') : sortBy === 'neighborhood' ? (b.neighborhood || '') : sortBy === 'price' ? b.price : sortBy === 'citaAt' ? (b.citaAt || '') : (b.notas || '')
        if (sortBy === 'price') {
          const diff = (va as number) - (vb as number)
          return sortDir === 'asc' ? diff : -diff
        }
        if (sortBy === 'citaAt') {
          const da = va ? new Date(va as string).getTime() : 0
          const db = vb ? new Date(vb as string).getTime() : 0
          const diff = da - db
          return sortDir === 'asc' ? diff : -diff
        }
        const sa = String(va).localeCompare(String(vb), 'es')
        return sortDir === 'asc' ? sa : -sa
      })
    : filteredBySearch

  const visitedListings = listings.filter((l) => l.visitado === true)
  const now = Date.now()
  const upcomingCitasListings = listings.filter(
    (l) => l.citaAt != null && new Date(l.citaAt).getTime() > now
  )
  const pastCitasListings = listings.filter(
    (l) =>
      isMadridArea(l) &&
      l.citaAt != null &&
      new Date(l.citaAt).getTime() <= now &&
      !(l.visitado === true)
  )
  const sortedPastCitasListings = [...pastCitasListings].sort(
    (a, b) => new Date(b.citaAt!).getTime() - new Date(a.citaAt!).getTime()
  )
  const sortedUpcomingCitasListings = [...upcomingCitasListings].sort(
    (a, b) =>
      new Date(a.citaAt!).getTime() - new Date(b.citaAt!).getTime()
  )
  const sortedVisitedListings = sortBy
    ? [...visitedListings].sort((a, b) => {
        let va: string | number | null = sortBy === 'publishedAddress' ? (a.publishedAddress || a.title || '') : sortBy === 'neighborhood' ? (a.neighborhood || '') : sortBy === 'price' ? a.price : sortBy === 'citaAt' ? (a.citaAt || '') : (a.notas || '')
        let vb: string | number | null = sortBy === 'publishedAddress' ? (b.publishedAddress || b.title || '') : sortBy === 'neighborhood' ? (b.neighborhood || '') : sortBy === 'price' ? b.price : sortBy === 'citaAt' ? (b.citaAt || '') : (b.notas || '')
        if (sortBy === 'price') {
          const diff = (va as number) - (vb as number)
          return sortDir === 'asc' ? diff : -diff
        }
        if (sortBy === 'citaAt') {
          const da = va ? new Date(va as string).getTime() : 0
          const db = vb ? new Date(vb as string).getTime() : 0
          const diff = da - db
          return sortDir === 'asc' ? diff : -diff
        }
        const sa = String(va).localeCompare(String(vb), 'es')
        return sortDir === 'asc' ? sa : -sa
      })
    : visitedListings

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)

  const editingRow = editingId != null ? listings.find((l) => l.id === editingId) : null
  const editingPhoneRow = phoneDialogId != null ? listings.find((l) => l.id === phoneDialogId) : null

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLinks}>
            <Link href="/" className={styles.backLink}>← Volver al Gestor</Link>
            <Link href="/calculadora" className={styles.backLink}>
              <span className={styles.linkIcon} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <rect x="6" y="6" width="12" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
                  <line x1="8" y1="14" x2="10" y2="14" />
                  <line x1="14" y1="14" x2="16" y2="14" />
                  <line x1="8" y1="18" x2="10" y2="18" />
                  <line x1="14" y1="18" x2="16" y2="18" />
                </svg>
              </span>
              Calculadora
            </Link>
          </div>
          <h1 className={styles.title}>📇 Pisos en venta – Contactos</h1>
          <p className={styles.subtitle}>
            Índice de barrios y listado de pisos en compra. Edita cita y notas; se guardan en la base de datos.
          </p>
        </header>

        {loading && (
          <section className={styles.section}>
            <p className={styles.loading}>Cargando pisos en venta…</p>
          </section>
        )}

        {!loading && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Visitas Hechas ({visitedListings.length})</h2>
              {visitedListings.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.thSortable} onClick={() => handleSort('publishedAddress')}>
                          Dirección {sortBy === 'publishedAddress' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('neighborhood')}>
                          Barrio {sortBy === 'neighborhood' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th>Link Idealista</th>
                        <th className={styles.thSortable} onClick={() => handleSort('price')}>
                          Precio {sortBy === 'price' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('citaAt')}>
                          Cita {sortBy === 'citaAt' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('notas')}>
                          Notas {sortBy === 'notas' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thLlamado}>Llamé</th>
                        <th className={styles.thVisitado}>Visitado</th>
                        <th className={styles.thActions}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVisitedListings.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.cellAddress}>
                            {row.publishedAddress || row.title || '—'}
                          </td>
                          <td>{row.neighborhood || '—'}</td>
                          <td>
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.linkIdealista}
                            >
                              Ver en Idealista
                            </a>
                          </td>
                          <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                          <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                          <td className={styles.cellNotas}>
                            {row.notas ? (row.notas.length > 60 ? `${row.notas.slice(0, 60)}…` : row.notas) : '—'}
                          </td>
                          <td className={styles.cellLlamado}>
                            <button
                              type="button"
                              className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                              onClick={() => openPhoneDialog(row)}
                              title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                              aria-label="Abrir diálogo teléfono y llamada"
                            >
                              <PhoneIcon />
                            </button>
                          </td>
                          <td className={styles.cellVisitado}>
                            <button
                              type="button"
                              className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                              onClick={() => handleToggleVisitado(row)}
                              disabled={visitadoTogglingId === row.id}
                              title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                              aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                            >
                              <VisitadoIcon />
                            </button>
                          </td>
                          <td className={styles.cellActions}>
                            <span className={styles.cellActionsButtons}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEdit(row)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => handleDelete(row.id)}
                                aria-label="Eliminar"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.noData}>No hay visitas hechas con el filtro actual.</p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Próximas Visitas {upcomingCitasListings.length > 0 && `(${upcomingCitasListings.length})`}
              </h2>
              {upcomingCitasListings.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Dirección</th>
                        <th>Barrio</th>
                        <th>Link Idealista</th>
                        <th>Precio</th>
                        <th>Cita</th>
                        <th>Notas</th>
                        <th className={styles.thLlamado}>Llamé</th>
                        <th className={styles.thVisitado}>Visitado</th>
                        <th className={styles.thActions}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUpcomingCitasListings.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.cellAddress}>
                            {row.publishedAddress || row.title || '—'}
                          </td>
                          <td>{row.neighborhood || '—'}</td>
                          <td>
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.linkIdealista}
                            >
                              Ver en Idealista
                            </a>
                          </td>
                          <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                          <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                          <td className={styles.cellNotas}>
                            {row.notas ? (row.notas.length > 60 ? `${row.notas.slice(0, 60)}…` : row.notas) : '—'}
                          </td>
                          <td className={styles.cellLlamado}>
                            <button
                              type="button"
                              className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                              onClick={() => openPhoneDialog(row)}
                              title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                              aria-label="Abrir diálogo teléfono y llamada"
                            >
                              <PhoneIcon />
                            </button>
                          </td>
                          <td className={styles.cellVisitado}>
                            <button
                              type="button"
                              className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                              onClick={() => handleToggleVisitado(row)}
                              disabled={visitadoTogglingId === row.id}
                              title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                              aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                            >
                              <VisitadoIcon />
                            </button>
                          </td>
                          <td className={styles.cellActions}>
                            <span className={styles.cellActionsButtons}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEdit(row)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => handleDelete(row.id)}
                                aria-label="Eliminar"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.noData}>No hay citas futuras con el filtro actual.</p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Citas pasadas (pendiente marcar visitado) {pastCitasListings.length > 0 && `(${pastCitasListings.length})`}
              </h2>
              {pastCitasListings.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Dirección</th>
                        <th>Barrio</th>
                        <th>Link Idealista</th>
                        <th>Precio</th>
                        <th>Cita</th>
                        <th>Notas</th>
                        <th className={styles.thLlamado}>Llamé</th>
                        <th className={styles.thVisitado}>Visitado</th>
                        <th className={styles.thActions}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPastCitasListings.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.cellAddress}>
                            {row.publishedAddress || row.title || '—'}
                          </td>
                          <td>{row.neighborhood || '—'}</td>
                          <td>
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.linkIdealista}
                            >
                              Ver en Idealista
                            </a>
                          </td>
                          <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                          <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                          <td className={styles.cellNotas}>
                            {row.notas ? (row.notas.length > 60 ? `${row.notas.slice(0, 60)}…` : row.notas) : '—'}
                          </td>
                          <td className={styles.cellLlamado}>
                            <button
                              type="button"
                              className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                              onClick={() => openPhoneDialog(row)}
                              title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                              aria-label="Abrir diálogo teléfono y llamada"
                            >
                              <PhoneIcon />
                            </button>
                          </td>
                          <td className={styles.cellVisitado}>
                            <button
                              type="button"
                              className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                              onClick={() => handleToggleVisitado(row)}
                              disabled={visitadoTogglingId === row.id}
                              title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                              aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                            >
                              <VisitadoIcon />
                            </button>
                          </td>
                          <td className={styles.cellActions}>
                            <span className={styles.cellActionsButtons}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEdit(row)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => handleDelete(row.id)}
                                aria-label="Eliminar"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.noData}>No hay citas pasadas.</p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Barrios</h2>
              {barrios.length === 0 ? (
                <p className={styles.noData}>
                  No hay pisos de compra en la base de datos para esta provincia. Cambia de provincia o añade pisos desde el gestor principal.
                </p>
              ) : (
                <div className={styles.barrioIndex}>
                  <button
                    type="button"
                    className={`${styles.barrioChip} ${selectedBarrio === null ? styles.barrioChipActive : ''}`}
                    onClick={() => setSelectedBarrio(null)}
                  >
                    Todos ({filteredForTodos.length})
                  </button>
                  {barrios.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`${styles.barrioChip} ${selectedBarrio === b ? styles.barrioChipActive : ''}`}
                      onClick={() => setSelectedBarrio(b)}
                    >
                      {b} ({filteredForTodos.filter((l) => l.neighborhood === b).length})
                    </button>
                  ))}
                </div>
              )}
            </section>

            {listings.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {selectedBarrio ? `Pisos en venta – ${selectedBarrio}` : 'Todos los pisos en venta'}
                </h2>
                <div className={styles.searchRow}>
                  <div className={styles.searchGroup}>
                    <label className={styles.filterLabel} htmlFor="contactos-search">
                      Buscar
                    </label>
                    <input
                      id="contactos-search"
                      type="text"
                      className={styles.searchInput}
                      placeholder="Por dirección o precio…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className={styles.priceFilterGroup}>
                    <label className={styles.filterLabel} htmlFor="contactos-max-price">
                      Precio máximo
                    </label>
                    <select
                      id="contactos-max-price"
                      className={styles.select}
                      value={selectedMaxPrice}
                      onChange={(e) => setSelectedMaxPrice(e.target.value)}
                    >
                      <option value="all">Todos los precios</option>
                      <option value="100000">Menores de 100.000€</option>
                      <option value="150000">Menores de 150.000€</option>
                      <option value="180000">Menores de 180.000€</option>
                      <option value="200000">Menores de 200.000€</option>
                      <option value="250000">Menores de 250.000€</option>
                      <option value="300000">Menores de 300.000€</option>
                      <option value="400000">Menores de 400.000€</option>
                      <option value="500000">Menores de 500.000€</option>
                    </select>
                  </div>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.thSortable} onClick={() => handleSort('publishedAddress')}>
                          Dirección {sortBy === 'publishedAddress' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('neighborhood')}>
                          Barrio {sortBy === 'neighborhood' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th>Link Idealista</th>
                        <th className={styles.thSortable} onClick={() => handleSort('price')}>
                          Precio {sortBy === 'price' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('citaAt')}>
                          Cita {sortBy === 'citaAt' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thSortable} onClick={() => handleSort('notas')}>
                          Notas {sortBy === 'notas' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </th>
                        <th className={styles.thLlamado}>Llamé</th>
                        <th className={styles.thVisitado}>Visitado</th>
                        <th className={styles.thActions}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedListings.map((row) => (
                        <tr key={row.id}>
                          <td className={styles.cellAddress}>
                            {row.publishedAddress || row.title || '—'}
                          </td>
                          <td>{row.neighborhood || '—'}</td>
                          <td>
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.linkIdealista}
                            >
                              Ver en Idealista
                            </a>
                          </td>
                          <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                          <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                          <td className={styles.cellNotas}>
                            {row.notas ? (row.notas.length > 60 ? `${row.notas.slice(0, 60)}…` : row.notas) : '—'}
                          </td>
                          <td className={styles.cellLlamado}>
                            <button
                              type="button"
                              className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                              onClick={() => openPhoneDialog(row)}
                              title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                              aria-label="Abrir diálogo teléfono y llamada"
                            >
                              <PhoneIcon />
                            </button>
                          </td>
                          <td className={styles.cellVisitado}>
                            <button
                              type="button"
                              className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                              onClick={() => handleToggleVisitado(row)}
                              disabled={visitadoTogglingId === row.id}
                              title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                              aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                            >
                              <VisitadoIcon />
                            </button>
                          </td>
                          <td className={styles.cellActions}>
                            <span className={styles.cellActionsButtons}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEdit(row)}
                                aria-label="Editar"
                                title="Editar"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => handleDelete(row.id)}
                                aria-label="Eliminar"
                                title="Eliminar"
                              >
                                <TrashIcon />
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <section className={styles.section}>
          <Link href="/" className={styles.backButton}>
            Volver al Gestor de Pisos
          </Link>
        </section>
      </div>

      {/* Modal editar */}
      {editingRow && (
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar: {editingRow.publishedAddress || editingRow.title || 'Piso'}</h2>
              <button type="button" className={styles.modalClose} onClick={closeEdit} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cita (fecha y hora)</label>
                <div className={styles.citaRow}>
                  <input
                    type="date"
                    className={styles.input}
                    min={minDateToday()}
                    value={editForm.citaAt ? editForm.citaAt.slice(0, 10) : ''}
                    onChange={(e) => {
                      const date = e.target.value
                      const time = editForm.citaAt?.slice(11, 16) || '00:00'
                      setEditForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  />
                  <select
                    className={styles.select}
                    value={editForm.citaAt ? editForm.citaAt.slice(11, 16) : ''}
                    onChange={(e) => {
                      const time = e.target.value
                      const date = editForm.citaAt?.slice(0, 10) || minDateToday()
                      setEditForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  >
                    <option value="">—</option>
                    {(editForm.citaAt?.slice(0, 10) === minDateToday()
                      ? TIME_SLOTS_10.filter((slot) => slot >= minTimeForDate(minDateToday()))
                      : TIME_SLOTS_10
                    ).map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Notas</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={editForm.notas}
                  onChange={(e) => setEditForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Añade notas sobre este piso…"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal teléfono / ¿Llamé? */}
      {editingPhoneRow && (
        <div className={styles.modalOverlay} onClick={closePhoneDialog}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Teléfono · {editingPhoneRow.publishedAddress || editingPhoneRow.title || 'Piso'}</h2>
              <button type="button" className={styles.modalClose} onClick={closePhoneDialog} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Teléfono</label>
                <input
                  type="tel"
                  className={styles.input}
                  value={phoneDialogForm.phone}
                  onChange={(e) => setPhoneDialogForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej. 612 345 678"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>¿Llamé?</label>
                <div className={styles.llameRow}>
                  <button
                    type="button"
                    className={phoneDialogForm.llamado ? styles.btnLlamadoSi : styles.btnLlamado}
                    onClick={() => setPhoneDialogForm((f) => ({ ...f, llamado: true }))}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={!phoneDialogForm.llamado ? styles.btnLlamadoNoActive : styles.btnLlamado}
                    onClick={() => setPhoneDialogForm((f) => ({ ...f, llamado: false }))}
                  >
                    No
                  </button>
                </div>
                {phoneDialogForm.llamado && (
                  <span className={styles.llameHint}>El icono se verá en verde al guardar</span>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closePhoneDialog}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={savePhoneDialog}
                disabled={savingPhone}
              >
                {savingPhone ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

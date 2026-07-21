'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { IdealistaLinkIcon } from '../components/IdealistaLinkIcon'
import { IconBuilding2 } from '../components/icons/IconBuilding2'
import styles from './page.module.css'

interface Listing {
  id: number
  title: string | null
  price: number
  surface: number | null
  link: string
  profitabilityRate: number | null
  type: 'alquiler' | 'compra'
  neighborhood: string | null
  city: string | null
  province: string | null
  publishedAddress: string | null
  rooms: number | null
}

/** Provincia por defecto en filtros y formulario; barrio del filtro sin valor por defecto (Todos). */
const DEFAULT_PROVINCE = 'Madrid'

/** Superficie mínima por defecto (≥ 40 m²); opción ≥ 80 m². */
const DEFAULT_MIN_SURFACE = '40' as const

const LISTINGS_PER_PAGE = 16

type MinSurfaceOption = '40' | '80'

export default function Home() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [listings, setListings] = useState<Listing[]>([])
  const [barrioOptions, setBarrioOptions] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [stats, setStats] = useState<any>(null)
  /** Total de filas en `listings` (sin aplicar filtros de la query). */
  const [totalInDb, setTotalInDb] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<'alquiler' | 'compra' | 'all'>('all')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all')
  const [selectedProvince, setSelectedProvince] = useState<string>(DEFAULT_PROVINCE)
  /** Sin tope por defecto: compras > 200k no desaparecen tras importar. */
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<string>('all')
  const [selectedMinSurface, setSelectedMinSurface] =
    useState<MinSurfaceOption>(DEFAULT_MIN_SURFACE)
  const [searchQuery, setSearchQuery] = useState('')
  const [listingsPage, setListingsPage] = useState(1)
  const listingsListAnchorRef = useRef<HTMLDivElement | null>(null)
  const filtersDialogRef = useRef<HTMLDialogElement | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!isAdmin && showModal) setShowModal(false)
  }, [isAdmin, showModal])

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    surface: '',
    link: '',
    profitabilityRate: '',
    type: 'alquiler' as 'alquiler' | 'compra',
    neighborhood: '',
    city: '',
    province: DEFAULT_PROVINCE,
    publishedAddress: '',
    rooms: '',
  })

  const openFiltersDialog = useCallback(() => {
    filtersDialogRef.current?.showModal()
    window.setTimeout(() => {
      const el = document.getElementById('filter-province') as HTMLSelectElement | null
      if (!el) return
      try {
        el.focus({ preventScroll: true })
      } catch {
        el.focus()
      }
    }, 100)
  }, [])

  // Cargar todos los datos en una sola petición (4 conexiones → 1)
  const loadHomeData = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') {
        params.append('type', selectedType)
      }
      if (selectedNeighborhood !== 'all') {
        params.append('neighborhood', selectedNeighborhood)
      }
      if (selectedProvince !== 'all') {
        params.append('province', selectedProvince)
      }
      if (selectedMaxPrice !== 'all') {
        params.append('maxPrice', selectedMaxPrice)
      }
      params.append('minSurface', selectedMinSurface)

      const response = await fetch(`/api/home-data?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success && result.data) {
        const { listings: list, stats: s, provinces: p, totalInDb: total } = result.data
        setListings(list || [])
        setStats(s ?? null)
        setTotalInDb(typeof total === 'number' ? total : 0)
        if (p && p.length > 0) {
          setProvinces(p)
          if (selectedProvince !== 'all' && !p.includes(selectedProvince)) {
            setSelectedProvince(p[0])
          } else if (p.includes(DEFAULT_PROVINCE) && selectedProvince === 'all') {
            setSelectedProvince(DEFAULT_PROVINCE)
          }
        }
      } else {
        console.error('API returned error:', result.error)
        setError(result.error || 'Error al cargar los pisos')
        setListings([])
        setStats(null)
        setTotalInDb(0)
      }
    } catch (error) {
      console.error('Error loading home data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar los pisos')
      setListings([])
      setTotalInDb(null)
    } finally {
      setLoading(false)
    }
  }

  /** Solo barrios con ≥1 piso (según provincia / tipo / precio máximo). */
  useEffect(() => {
    let cancelled = false
    async function loadBarrioOptions() {
      if (selectedProvince === 'all') {
        if (!cancelled) {
          setBarrioOptions([])
          setSelectedNeighborhood('all')
        }
        return
      }
      try {
        const params = new URLSearchParams()
        params.set('all', 'true')
        params.set('province', selectedProvince)
        if (selectedType !== 'all') {
          params.set('type', selectedType)
        }
        if (selectedMaxPrice !== 'all') {
          params.set('maxPrice', selectedMaxPrice)
        }
        params.set('minSurface', selectedMinSurface)
        const res = await fetch(`/api/neighborhoods?${params.toString()}`)
        const json = await res.json()
        if (!cancelled && json.success && Array.isArray(json.data)) {
          const names = [...json.data].sort((a, b) =>
            a.localeCompare(b, 'es')
          )
          setBarrioOptions(names)
          setSelectedNeighborhood((prev) => {
            if (prev === 'all') return prev
            if (names.length === 0 || !names.includes(prev)) return 'all'
            return prev
          })
        } else if (!cancelled) {
          setBarrioOptions([])
          setSelectedNeighborhood((prev) => (prev !== 'all' ? 'all' : prev))
        }
      } catch {
        if (!cancelled) {
          setBarrioOptions([])
          setSelectedNeighborhood((prev) => (prev !== 'all' ? 'all' : prev))
        }
      }
    }
    loadBarrioOptions()
    return () => {
      cancelled = true
    }
  }, [selectedProvince, selectedType, selectedMaxPrice, selectedMinSurface])

  useEffect(() => {
    loadHomeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedNeighborhood, selectedProvince, selectedMaxPrice, selectedMinSurface])

  /** Refinado en cliente (misma lista que devuelve la API con los filtros). */
  const displayedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return listings
    return listings.filter((l) => {
      const haystack = [l.title, l.city, l.neighborhood, l.publishedAddress, l.province, String(l.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        haystack.includes(q) ||
        q
          .split(/\s+/)
          .filter(Boolean)
          .every((word) => haystack.includes(word))
      )
    })
  }, [listings, searchQuery])

  const totalListingsPages = useMemo(
    () => Math.max(1, Math.ceil(displayedListings.length / LISTINGS_PER_PAGE)),
    [displayedListings.length]
  )

  const paginatedListings = useMemo(() => {
    const start = (listingsPage - 1) * LISTINGS_PER_PAGE
    return displayedListings.slice(start, start + LISTINGS_PER_PAGE)
  }, [displayedListings, listingsPage])

  useEffect(() => {
    setListingsPage(1)
  }, [searchQuery, selectedType, selectedNeighborhood, selectedProvince, selectedMaxPrice, selectedMinSurface])

  useEffect(() => {
    setListingsPage((p) => Math.min(p, totalListingsPages))
  }, [totalListingsPages])

  const goToListingsPage = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(next, totalListingsPages))
      setListingsPage(clamped)
      requestAnimationFrame(() => {
        listingsListAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [totalListingsPages]
  )

  // Crear nuevo piso
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        setShowModal(false)
        setFormData({
          title: '',
          price: '',
          surface: '',
          link: '',
          profitabilityRate: '',
          type: 'alquiler',
          neighborhood: '',
          city: '',
          province: DEFAULT_PROVINCE,
          publishedAddress: '',
          rooms: '',
        })
        loadHomeData()
      } else {
        alert(result.error || 'Error al crear el piso')
      }
    } catch (error) {
      console.error('Error creating listing:', error)
      alert('Error al crear el piso')
    }
  }

  // Eliminar piso
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este piso?')) {
      return
    }

    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        loadHomeData()
      } else {
        alert(result.error || 'Error al eliminar el piso')
      }
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Error al eliminar el piso')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <dialog
          ref={filtersDialogRef}
          id="panel-filtros-pisos"
          className={styles.filtersDialog}
          aria-labelledby="filters-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) filtersDialogRef.current?.close()
          }}
        >
          <div
            className={styles.filtersDialogPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.filtersDialogHeader}>
              <h2 id="filters-dialog-title" className={styles.filtersTitle}>
                Filtros
              </h2>
              <button
                type="button"
                className={styles.filtersDialogClose}
                onClick={() => filtersDialogRef.current?.close()}
                aria-label="Cerrar filtros"
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <div className={styles.filtersDialogBody}>
          <div className={styles.filtersDialogTypeRow}>
            <div className={styles.filterChips} role="group" aria-label="Tipo de anuncio">
              <button
                type="button"
                className={`${styles.filterChip} ${selectedType === 'all' ? styles.filterChipActive : ''}`}
                onClick={() => setSelectedType('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${selectedType === 'alquiler' ? styles.filterChipActive : ''}`}
                onClick={() => setSelectedType('alquiler')}
              >
                Alquiler
              </button>
              <button
                type="button"
                className={`${styles.filterChip} ${selectedType === 'compra' ? styles.filterChipActive : ''}`}
                onClick={() => setSelectedType('compra')}
              >
                Compra
              </button>
            </div>
          </div>

          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-province">
                Provincia
              </label>
              <select
                id="filter-province"
                className={styles.select}
                value={provinces.length === 0 ? 'all' : selectedProvince}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedProvince(v)
                  setSelectedNeighborhood('all')
                }}
                title="Filtrar por provincia"
              >
                <option value="all">Todas las provincias</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-barrio">
                Barrio
              </label>
              <select
                id="filter-barrio"
                className={styles.select}
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                disabled={selectedProvince === 'all'}
              >
                <option value="all">Todos los barrios</option>
                {barrioOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="filter-precio">
                Precio máximo
              </label>
              <select
                id="filter-precio"
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

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel} id="filter-surface-label">
                Superficie mín.
              </span>
              <div
                className={styles.surfaceChips}
                role="group"
                aria-labelledby="filter-surface-label"
              >
                <button
                  type="button"
                  className={`${styles.filterChip} ${selectedMinSurface === '40' ? styles.filterChipActive : ''}`}
                  onClick={() => setSelectedMinSurface('40')}
                >
                  &gt; 40 m²
                </button>
                <button
                  type="button"
                  className={`${styles.filterChip} ${selectedMinSurface === '80' ? styles.filterChipActive : ''}`}
                  onClick={() => setSelectedMinSurface('80')}
                >
                  &gt; 80 m²
                </button>
              </div>
            </div>
          </div>
            </div>
            <div className={styles.filtersDialogFooter}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => filtersDialogRef.current?.close()}
              >
                Listo
              </button>
            </div>
          </div>
        </dialog>

        {!error && (
          <section className={styles.homeHero} aria-labelledby="home-hero-title">
            <div className={styles.homeHeroInner}>
              <div className={styles.homeHeroText}>
                <p className={styles.homeHeroKicker}>
                  <span className={styles.homeHeroKickerDot} aria-hidden />
                  Panel principal
                </p>
                <h1 id="home-hero-title" className={styles.homeHeroTitle}>
                  Tus pisos, en un solo{' '}
                  <span className={styles.homeHeroTitleAccent}>dashboard</span>
                </h1>
                <p className={styles.homeHeroLead}>
                  Encuentra anuncios con la mejor rentabilidad, gestiona tus citas y contactos,
                  utiliza la calculadora de rentabilidad para evaluar si es una buena inversión.
                </p>
              </div>
              <div className={styles.homeHeroActions}>
                <button
                  type="button"
                  className={styles.homeHeroBtnFilters}
                  onClick={openFiltersDialog}
                  aria-controls="panel-filtros-pisos"
                >
                  <span className={styles.homeHeroBtnIcon} aria-hidden>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                  </span>
                  Filtros
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    className={styles.homeHeroBtnCta}
                    onClick={() => setShowModal(true)}
                  >
                    <span className={styles.homeHeroBtnIcon} aria-hidden>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                    Nuevo piso
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {!loading &&
          !error &&
          totalInDb !== null &&
          totalInDb > 0 &&
          listings.length === 0 && (
            <div className={styles.filterMismatchBanner}>
              Hay <strong>{totalInDb}</strong> pisos en la base;{' '}
              <strong>ninguno cumple los filtros</strong> (provincia, barrio, precio, tipo o
              superficie).
              <button
                type="button"
                className={styles.btnFiltersReset}
                onClick={() => {
                  setSelectedProvince('all')
                  setSelectedNeighborhood('all')
                  setSelectedMaxPrice('all')
                  setSelectedType('all')
                  setSelectedMinSurface(DEFAULT_MIN_SURFACE)
                }}
              >
                Ver todos los pisos (quitar filtros)
              </button>
              <button
                type="button"
                className={styles.btnFiltersOpenDialog}
                onClick={openFiltersDialog}
              >
                Abrir filtros…
              </button>
            </div>
          )}

        {/* Error message */}
        {error && (
          <div className={styles.errorCard}>
            <h2 className={styles.errorTitle}>⚠️ Error</h2>
            <p className={styles.errorMessage}>{error}</p>
            <p className={styles.errorMessage} style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              Verifica que la base de datos esté configurada correctamente y que las variables de entorno estén establecidas.
            </p>
            {isAdmin ? (
              <p className={styles.errorMessage} style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                <a href="/api/health/db" target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                  Ver diagnóstico de conexión →
                </a>
              </p>
            ) : null}
            <button className={styles.btnPrimary} onClick={() => {
              setError(null)
              loadHomeData()
            }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Welcome message when no data (primera carga sin nada en la base) */}
        {!loading && !error && totalInDb === 0 && (
          <div className={styles.welcomeCard}>
            <h2 className={styles.welcomeTitle}>¡Bienvenido a FlashProp!</h2>
            <p className={styles.welcomeMessage}>
              Esta aplicación te permite gestionar y analizar pisos de alquiler y compra.
            </p>
            <p className={styles.welcomeMessage} style={{ fontSize: '0.9rem', marginTop: '12px' }}>
              <strong>0 en base</strong> con import hecho suele ser: importaste en <strong>producción (Vercel)</strong> y
              estás mirando <strong>local</strong> — entonces hacé <code style={{ fontSize: '0.85rem' }}>npm run db:sync-from-prod</code>, o
              importá otra vez con <code style={{ fontSize: '0.85rem' }}>node scripts/import-json.js ruta/archivo.json</code> y
              comprobá con <code style={{ fontSize: '0.85rem' }}>npm run db:status</code>.
            </p>
            <div className={styles.welcomeFeatures}>
              <p><strong>Características:</strong></p>
              <ul>
                <li>📊 Estadísticas detalladas por barrio</li>
                <li>🔍 Filtros avanzados (tipo, provincia, barrio, precio)</li>
                <li>💰 Cálculo de rentabilidad</li>
                {isAdmin ? (
                  <li>📥 Importar pisos desde HTML (Idealista) — en Ajustes</li>
                ) : (
                  <li>📥 La importación de la cartera la gestionan los administradores.</li>
                )}
              </ul>
            </div>
            {isAdmin ? (
              <Link href="/recomendaciones" className={styles.btnPrimary} style={{ display: 'inline-block', padding: '10px 20px', textDecoration: 'none', color: 'white' }}>
                Ir a Ajustes para importar pisos
              </Link>
            ) : (
              <p className={styles.welcomeMessage} style={{ fontSize: '0.9rem', marginTop: '16px' }}>
                Si la base está vacía, pedí a un <strong>administrador</strong> que importe o sincronice datos desde Ajustes.
              </p>
            )}
          </div>
        )}

        {/* Estadísticas (sin título visible: las tarjetas son autoexplicativas) */}
        {stats && stats.total > 0 && (
          <div className={styles.statsCard} role="region" aria-label="Métricas de la cartera de pisos">
            <div className={styles.statsGrid}>
              <div
                className={`${styles.statBox} ${styles.statBoxAccent}`}
                aria-label={`Pisos activos: ${stats.total}`}
              >
                <div className={styles.statBoxAccentOrb} aria-hidden />
                <div className={styles.statBoxAccentTop}>
                  <div className={styles.statLabel}>Pisos activos</div>
                  <span className={styles.statBoxAccentIcon}>
                    <IconBuilding2 size={18} />
                  </span>
                </div>
                <div className={styles.statValue}>{stats.total}</div>
              </div>

              <div className={styles.statBox}>
                <div className={styles.statLabel}>Precio promedio</div>
                <div className={styles.statValue}>{formatPrice(stats.avgPrice)}</div>
                {stats.minPrice > 0 && stats.maxPrice > 0 && (
                  <div className={styles.statRange}>
                    {formatPrice(stats.minPrice)} - {formatPrice(stats.maxPrice)}
                  </div>
                )}
              </div>

              <div className={styles.statBox}>
                <div className={styles.statLabel}>Superficie promedio</div>
                <div className={styles.statValue}>
                  {stats.avgSurface > 0 ? `${stats.avgSurface.toFixed(1)} m²` : 'N/A'}
                </div>
                {stats.minSurface > 0 && stats.maxSurface > 0 && (
                  <div className={styles.statRange}>
                    {stats.minSurface.toFixed(0)} - {stats.maxSurface.toFixed(0)} m²
                  </div>
                )}
              </div>

              <div className={styles.statBox}>
                <div className={styles.statLabel}>Habitaciones promedio</div>
                <div className={styles.statValue}>{stats.avgRooms > 0 ? stats.avgRooms.toFixed(1) : 'N/A'}</div>
                {Object.keys(stats.roomsDistribution ?? {}).length > 0 && (
                  <div className={styles.statRooms}>
                    {Object.entries(stats.roomsDistribution ?? {})
                      .sort(([a], [b]) => {
                        if (a === 'N/A') return 1
                        if (b === 'N/A') return -1
                        return parseInt(a) - parseInt(b)
                      })
                      .map(([rooms, count]) => (
                        <span key={rooms} className={styles.roomBadge}>
                          {rooms === '0' ? 'Estudio' : rooms === 'N/A' ? 'Sin datos' : `${rooms} hab`}: {count as number}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.listingSearchSection}>
              <div className={styles.listingSearchPanel}>
                <div className={styles.listingSearchHead}>
                  <label className={styles.listingSearchLabel} htmlFor="home-filtros-search">
                    Buscar
                  </label>
                </div>
                {/* Misma estructura que idealista-pro-makeover Index: columna (móvil) o fila (md) gap-3; chips en flex-wrap gap-2 */}
                <div className={styles.listingSearchStack}>
                  <div className={styles.searchWrap}>
                    <span className={styles.searchIcon} aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      id="home-filtros-search"
                      type="search"
                      className={styles.searchInput}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por dirección, ciudad o referencia…"
                      aria-label="Buscar pisos en la lista actual"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas por barrio */}
            {stats.byNeighborhood && Object.keys(stats.byNeighborhood).length > 0 && (
              <section
                className={styles.neighborhoodStats}
                aria-labelledby="por-barrio-heading"
              >
                <header className={styles.neighborhoodStatsHeader}>
                  <span className={styles.neighborhoodStatsKicker}>
                    <span className={styles.neighborhoodStatsKickerDot} aria-hidden />
                    Análisis local
                  </span>
                  <h3 id="por-barrio-heading" className={styles.subsectionTitleNeighborhood}>
                    Por <span className={styles.subsectionTitleNeighborhoodAccent}>barrio</span>
                  </h3>
                  <p className={styles.neighborhoodStatsLead}>
                    Medias y rentabilidad por zona según los filtros activos.
                  </p>
                </header>
                <div className={styles.neighborhoodStatsGrid}>
                  {Object.entries(stats.byNeighborhood)
                    .sort(([, a], [, b]) => {
                      // Ordenar por rentabilidad descendente (mayor primero)
                      // Si no hay rentabilidad, poner al final
                      const aData = a as any
                      const bData = b as any
                      const aProfit = aData.avgProfitability ?? -1
                      const bProfit = bData.avgProfitability ?? -1
                      if (aProfit === -1 && bProfit === -1) return 0 // Ambos sin rentabilidad, mantener orden
                      if (aProfit === -1) return 1 // a sin rentabilidad, va al final
                      if (bProfit === -1) return -1 // b sin rentabilidad, a va primero
                      return bProfit - aProfit // Ordenar descendente por rentabilidad
                    })
                    .map(([neighborhood, data]: [string, any]) => {
                      const hasYield =
                        selectedType === 'all' &&
                        data.avgProfitability !== null &&
                        typeof data.avgProfitability === 'number' &&
                        !isNaN(data.avgProfitability)
                      return (
                        <div key={neighborhood} className={styles.neighborhoodStatBox}>
                          {hasYield && (
                            <div className={styles.neighborhoodYieldHero}>
                              <div className={styles.neighborhoodYieldHeroTop}>
                                <span className={styles.neighborhoodYieldLabel}>Rentabilidad bruta</span>
                              </div>
                              <p className={styles.neighborhoodYieldValue} aria-label={`Rentabilidad ${data.avgProfitability.toFixed(2)} por ciento`}>
                                {data.avgProfitability.toFixed(2)}%
                              </p>
                              {data.reliabilityPct != null && (
                                <span className={styles.neighborhoodYieldReliability}>
                                  Fiabilidad {data.reliabilityPct}%
                                </span>
                              )}
                            </div>
                          )}
                          <div className={styles.neighborhoodCardBody}>
                            <div className={styles.neighborhoodHeaderRow}>
                              <p className={styles.neighborhoodName}>{neighborhood}</p>
                            </div>
                            <div className={styles.neighborhoodMetaGrid}>
                              <div className={styles.neighborhoodMetaCell}>
                                <span className={styles.neighborhoodMetaLabel}>Precio medio</span>
                                <span className={styles.neighborhoodMetaValue}>{formatPrice(data.avgPrice)}</span>
                                {selectedType !== 'all' && (
                                  <span className={styles.neighborhoodMetaRange}>
                                    {formatPrice(data.minPrice)} – {formatPrice(data.maxPrice)}
                                  </span>
                                )}
                              </div>
                              {data.avgSurface > 0 && (
                                <div className={styles.neighborhoodMetaCell}>
                                  <span className={styles.neighborhoodMetaLabel}>Superficie</span>
                                  <span className={styles.neighborhoodMetaValue}>{data.avgSurface.toFixed(1)} m²</span>
                                  {data.avgRooms <= 0 && (
                                    <span
                                      className={`${styles.neighborhoodCountBadge} ${styles.neighborhoodCountPillInMeta}`}
                                    >
                                      {data.total} pisos
                                    </span>
                                  )}
                                </div>
                              )}
                              {data.avgRooms > 0 && (
                                <div
                                  className={`${styles.neighborhoodMetaCell} ${styles.neighborhoodMetaCellHab}`}
                                >
                                  <span className={styles.neighborhoodMetaLabel}>Hab.</span>
                                  <span className={styles.neighborhoodMetaValue}>{data.avgRooms.toFixed(1)}</span>
                                  <span
                                    className={`${styles.neighborhoodCountBadge} ${styles.neighborhoodCountPillInMeta}`}
                                  >
                                    {data.total} pisos
                                  </span>
                                </div>
                              )}
                            </div>
                            {data.avgSurface <= 0 && data.avgRooms <= 0 && (
                              <div className={styles.neighborhoodPisosFallback}>
                                <span className={styles.neighborhoodCountBadge}>{data.total} pisos</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
                <div className={styles.neighborhoodStatsCriterios}>
                  <div className={styles.rentabilidadCriterios}>
                    <h4 className={styles.criteriosTitle}>Criterio de rentabilidad</h4>
                    <p className={styles.criteriosText}>
                      La rentabilidad se calcula por barrio comparando <strong>precios medios de alquiler y compra por número de habitaciones</strong> (no el mismo piso). Para cada tramo (1 hab, 2 hab, …) se usa: (alquiler medio mensual × 12 / precio compra medio) × 100. El % del barrio es el promedio de esos tramos. El <strong>índice de fiabilidad</strong> depende de la cantidad de anuncios y de tramos usados (más datos = más fiable).
                    </p>
                    <div className={styles.criteriosLinks}>
                      <Link href="/reporte" className={styles.criteriosLink}>Ver reporte completo: fórmulas, circunstancias e índice de fiabilidad →</Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Lista de pisos */}
        {loading ? (
          <div className={styles.loading}>
            <p>Cargando pisos...</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
              Si esto tarda mucho, verifica la conexión a la base de datos
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 style={{ marginBottom: '16px' }}>No hay pisos disponibles</h2>
            <p>No se encontraron pisos con los filtros seleccionados.</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
              Probá con «Todas las provincias» o revisá que la base de datos esté conectada.
            </p>
            <button 
              className={styles.btnPrimary} 
              onClick={() => {
                setSelectedType('all')
                setSelectedNeighborhood('all')
                setSelectedProvince('all')
                setSelectedMaxPrice('all')
                setSelectedMinSurface(DEFAULT_MIN_SURFACE)
                loadHomeData()
              }}
              style={{ marginTop: '16px' }}
            >
              Ver todos los pisos
            </button>
          </div>
        ) : displayedListings.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 style={{ marginBottom: '16px' }}>Sin resultados con esta búsqueda</h2>
            <p style={{ fontSize: '0.95rem' }}>
              Ningún piso de los {listings.length} actuales coincide con «{searchQuery.trim() || '…'}».
            </p>
            <button
              className={styles.btnPrimary}
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ marginTop: '16px' }}
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.listingsListWrap}>
            <div
              ref={listingsListAnchorRef}
              className={styles.listingsListAnchor}
              aria-hidden
            />
            <div className={styles.listingsGrid}>
            {paginatedListings.map((listing) => (
              <div key={listing.id} className={styles.listingCard}>
                <div className={styles.listingHeader}>
                  <h3 className={styles.listingTitle}>{listing.title || 'Sin título'}</h3>
                  <span className={`${styles.badge} ${listing.type === 'alquiler' ? styles.badgeInfo : styles.badgeSuccess}`}>
                    {listing.type === 'alquiler' ? 'Alquiler' : 'Compra'}
                  </span>
                </div>

                <div className={styles.listingInfo}>
                  <div className={styles.price}>{formatPrice(listing.price)}</div>
                  {listing.province && (
                    <div className={styles.meta}>🏛️ Provincia: {listing.province}</div>
                  )}
                  {listing.surface && (
                    <div className={styles.meta}>📐 {listing.surface} m²</div>
                  )}
                  {(listing.neighborhood || listing.city) && (
                    <div className={styles.meta}>
                      📍 {[listing.neighborhood, listing.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {listing.profitabilityRate && (
                    <div className={styles.profitability}>
                      💰 Rentabilidad: {listing.profitabilityRate}%
                    </div>
                  )}
                  {listing.rooms && (
                    <div className={styles.meta}>🛏️ {listing.rooms} habitaciones</div>
                  )}
                  {listing.publishedAddress && (
                    <div className={styles.meta}>📍 {listing.publishedAddress}</div>
                  )}
                </div>

                <div className={styles.listingActions}>
                  <IdealistaLinkIcon
                    href={listing.link}
                    className={`${styles.btnLink} ${styles.btnLinkIdealistaIcon}`}
                    imgClassName={styles.btnLinkIdealistaImg}
                  />
                  {isAdmin ? (
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={() => handleDelete(listing.id)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            </div>
            {displayedListings.length > 0 && (
              <nav
                className={styles.listingsPagination}
                aria-label="Paginación de resultados de pisos"
              >
                <p className={styles.listingsPaginationInfo}>
                  Mostrando{' '}
                  <strong>
                    {Math.min(
                      (listingsPage - 1) * LISTINGS_PER_PAGE + 1,
                      displayedListings.length
                    )}
                    –{Math.min(listingsPage * LISTINGS_PER_PAGE, displayedListings.length)}
                  </strong>{' '}
                  de <strong>{displayedListings.length}</strong> pisos
                  {totalListingsPages > 1
                    ? ` · Página ${listingsPage} de ${totalListingsPages}`
                    : null}
                </p>
                {totalListingsPages > 1 && (
                  <div className={styles.listingsPaginationBar}>
                    <button
                      type="button"
                      className={styles.listingsPageBtn}
                      onClick={() => goToListingsPage(listingsPage - 1)}
                      disabled={listingsPage <= 1}
                    >
                      ← Anterior
                    </button>
                    <span className={styles.listingsPageNumbers} aria-hidden>
                      {listingsPage} / {totalListingsPages}
                    </span>
                    <button
                      type="button"
                      className={styles.listingsPageBtn}
                      onClick={() => goToListingsPage(listingsPage + 1)}
                      disabled={listingsPage >= totalListingsPages}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Modal para añadir piso (solo admins en UI; API también valida) */}
      {isAdmin && showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Añadir Nuevo Piso</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Título del piso *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Precio (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Metros cuadrados</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={formData.surface}
                    onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Link a Idealista *</label>
                <input
                  type="url"
                  className={styles.input}
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tasa de rentabilidad (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={formData.profitabilityRate}
                    onChange={(e) => setFormData({ ...formData, profitabilityRate: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo *</label>
                  <select
                    className={styles.select}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'alquiler' | 'compra' })}
                    required
                  >
                    <option value="alquiler">Alquiler</option>
                    <option value="compra">Compra</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Barrio</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Ciudad</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Dirección publicada</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.publishedAddress}
                    onChange={(e) => setFormData({ ...formData, publishedAddress: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Habitaciones</label>
                  <input
                    type="number"
                    min="0"
                    className={styles.input}
                    value={formData.rooms}
                    onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Añadir Piso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

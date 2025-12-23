'use client'

import { useState, useEffect } from 'react'
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
  publishedAddress: string | null
  rooms: number | null
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<'alquiler' | 'compra' | 'all'>('all')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    surface: '',
    link: '',
    profitabilityRate: '',
    type: 'alquiler' as 'alquiler' | 'compra',
    neighborhood: '',
    city: '',
    publishedAddress: '',
    rooms: '',
  })

  // Cargar pisos
  const loadListings = async () => {
    setLoading(true)
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

      const response = await fetch(`/api/listings?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        setListings(result.data || [])
      } else {
        console.error('API returned error:', result.error)
        setListings([])
      }
    } catch (error) {
      console.error('Error loading listings:', error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  // Cargar estadísticas
  const loadStats = async () => {
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

      const response = await fetch(`/api/stats?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      } else {
        console.error('API returned error:', result.error)
        setStats(null)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(null)
    }
  }

  // Cargar barrios
  const loadNeighborhoods = async () => {
    try {
      // Obtener todos los barrios disponibles (filtrados por provincia si está seleccionada)
      const params = new URLSearchParams()
      params.append('all', 'true')
      if (selectedProvince !== 'all') {
        params.append('province', selectedProvince)
      }
      
      const response = await fetch(`/api/neighborhoods?${params.toString()}`)
      const result = await response.json()
      if (result.success) {
        setNeighborhoods(result.data)
      }
    } catch (error) {
      console.error('Error loading neighborhoods:', error)
    }
  }

  // Cargar provincias
  const loadProvinces = async () => {
    try {
      const response = await fetch('/api/provinces')
      const result = await response.json()
      if (result.success) {
        setProvinces(result.data)
      }
    } catch (error) {
      console.error('Error loading provinces:', error)
    }
  }

  useEffect(() => {
    loadListings()
    loadNeighborhoods()
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedNeighborhood, selectedProvince])

  useEffect(() => {
    loadProvinces()
  }, [])

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
          publishedAddress: '',
          rooms: '',
        })
        loadListings()
        loadNeighborhoods()
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
        loadListings()
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
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Gestor de Pisos Idealista</h1>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            + Añadir Piso
          </button>
        </div>

        {/* Estadísticas */}
        {stats && stats.total > 0 && (
          <div className={styles.statsCard}>
            <h2 className={styles.sectionTitle}>📊 Estadísticas</h2>
            
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <div className={styles.statLabel}>Total de pisos</div>
                <div className={styles.statValue}>{stats.total}</div>
              </div>

              {selectedType === 'all' && (stats.avgPriceAlquiler !== null || stats.avgPriceCompra !== null) ? (
                <>
                  {stats.avgPriceAlquiler !== null && (
                    <div className={styles.statBox}>
                      <div className={styles.statLabel}>Precio promedio (Alquiler)</div>
                      <div className={styles.statValue}>{formatPrice(stats.avgPriceAlquiler)}</div>
                    </div>
                  )}
                  {stats.avgPriceCompra !== null && (
                    <div className={styles.statBox}>
                      <div className={styles.statLabel}>Precio promedio (Compra)</div>
                      <div className={styles.statValue}>{formatPrice(stats.avgPriceCompra)}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Precio promedio</div>
                  <div className={styles.statValue}>{formatPrice(stats.avgPrice)}</div>
                  <div className={styles.statRange}>
                    {formatPrice(stats.minPrice)} - {formatPrice(stats.maxPrice)}
                  </div>
                </div>
              )}

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
                {Object.keys(stats.roomsDistribution).length > 0 && (
                  <div className={styles.statRooms}>
                    {Object.entries(stats.roomsDistribution)
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

            {/* Estadísticas por barrio */}
            {Object.keys(stats.byNeighborhood).length > 0 && (
              <div className={styles.neighborhoodStats}>
                <h3 className={styles.subsectionTitle}>Por barrio:</h3>
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
                    .map(([neighborhood, data]: [string, any]) => (
                      <div key={neighborhood} className={styles.neighborhoodStatBox}>
                        <div className={styles.neighborhoodName}>{neighborhood}</div>
                        <div className={styles.neighborhoodDetails}>
                          <div className={styles.neighborhoodStat}>
                            <span className={styles.neighborhoodStatLabel}>Precio:</span>
                            <span className={styles.neighborhoodStatValue}>
                              {formatPrice(data.avgPrice)}
                            </span>
                            {selectedType !== 'all' && (
                              <span className={styles.neighborhoodStatRange}>
                                ({formatPrice(data.minPrice)} - {formatPrice(data.maxPrice)})
                              </span>
                            )}
                          </div>
                          {data.avgSurface > 0 && (
                            <div className={styles.neighborhoodStat}>
                              <span className={styles.neighborhoodStatLabel}>Superficie:</span>
                              <span className={styles.neighborhoodStatValue}>
                                {data.avgSurface.toFixed(1)} m²
                              </span>
                            </div>
                          )}
                          {data.avgRooms > 0 && (
                            <div className={styles.neighborhoodStat}>
                              <span className={styles.neighborhoodStatLabel}>Habitaciones:</span>
                              <span className={styles.neighborhoodStatValue}>
                                {data.avgRooms.toFixed(1)}
                              </span>
                            </div>
                          )}
                          <div className={styles.neighborhoodStat}>
                            <span className={styles.neighborhoodStatLabel}>Total:</span>
                            <span className={styles.neighborhoodStatValue}>{data.total} pisos</span>
                          </div>
                        </div>
                        {selectedType === 'all' && data.avgProfitability !== null && typeof data.avgProfitability === 'number' && !isNaN(data.avgProfitability) && (
                          <>
                            <div className={styles.neighborhoodProfitabilityDivider}></div>
                            <div className={styles.neighborhoodProfitability}>
                              <span className={styles.neighborhoodProfitabilityLabel}>💰 Rentabilidad</span>
                              <span className={styles.neighborhoodProfitabilityValue}>
                                {data.avgProfitability.toFixed(2)}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className={styles.filtersCard}>
          <h2 className={styles.sectionTitle}>Filtros</h2>
          
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tipo:</label>
              <div className={styles.typeButtons}>
                <button
                  className={`${styles.btnType} ${selectedType === 'all' ? styles.btnTypeActive : ''}`}
                  onClick={() => setSelectedType('all')}
                >
                  Todos
                </button>
                <button
                  className={`${styles.btnType} ${selectedType === 'alquiler' ? styles.btnTypeActive : ''}`}
                  onClick={() => setSelectedType('alquiler')}
                >
                  Alquiler
                </button>
                <button
                  className={`${styles.btnType} ${selectedType === 'compra' ? styles.btnTypeActive : ''}`}
                  onClick={() => setSelectedType('compra')}
                >
                  Compra
                </button>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Provincia:</label>
              <select
                className={styles.select}
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value)
                  setSelectedNeighborhood('all') // Reset barrio al cambiar provincia
                }}
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
              <label className={styles.filterLabel}>Barrio:</label>
              <select
                className={styles.select}
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                disabled={selectedProvince === 'all' && neighborhoods.length === 0}
              >
                <option value="all">Todos los barrios</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Precio máximo:</label>
              <select
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
        </div>

        {/* Lista de pisos */}
        {loading ? (
          <div className={styles.loading}>Cargando...</div>
        ) : listings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay pisos disponibles con estos filtros</p>
          </div>
        ) : (
          <div className={styles.listingsGrid}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.listingCard}>
                <div className={styles.listingHeader}>
                  <h3 className={styles.listingTitle}>{listing.title || 'Sin título'}</h3>
                  <span className={`${styles.badge} ${listing.type === 'alquiler' ? styles.badgeInfo : styles.badgeSuccess}`}>
                    {listing.type === 'alquiler' ? 'Alquiler' : 'Compra'}
                  </span>
                </div>

                <div className={styles.listingInfo}>
                  <div className={styles.price}>{formatPrice(listing.price)}</div>
                  {listing.surface && (
                    <div className={styles.meta}>📐 {listing.surface} m²</div>
                  )}
                  {listing.neighborhood && (
                    <div className={styles.meta}>
                      📍 {listing.neighborhood}
                      {listing.city && `, ${listing.city}`}
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
                  <a
                    href={listing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnLink}
                  >
                    Ver en Idealista
                  </a>
                  <button
                    className={styles.btnDanger}
                    onClick={() => handleDelete(listing.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para añadir piso */}
      {showModal && (
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

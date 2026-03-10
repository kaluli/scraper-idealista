'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface NeighborhoodData {
  total: number
  avgPrice: number
  avgProfitability: number | null
  reliabilityPct: number | null
}

export default function RecomendacionesPage() {
  const [stats, setStats] = useState<{ byNeighborhood: Record<string, NeighborhoodData> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setStats(json.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Barrios con rentabilidad en tus datos, ordenados por score (rentabilidad + fiabilidad)
  const barriosConRentabilidad = stats?.byNeighborhood
    ? Object.entries(stats.byNeighborhood)
        .filter(([, d]) => d.avgProfitability != null && !isNaN(d.avgProfitability))
        .map(([name, d]) => ({
          name,
          profitability: d.avgProfitability as number,
          reliability: d.reliabilityPct ?? 0,
          total: d.total,
        }))
        .sort((a, b) => {
          const scoreA = a.profitability * 0.7 + (a.reliability / 100) * 30
          const scoreB = b.profitability * 0.7 + (b.reliability / 100) * 30
          return scoreB - scoreA
        })
    : []

  const top5TusDatos = barriosConRentabilidad.slice(0, 5)

  // Barrios destacados en análisis 2026 (fuentes: 20minutos, Madrid Max Gestión, sector)
  const barrios2026 = [
    { name: 'Tetuán', reason: 'Mayor potencial revalorización 2026 (6,5% rentabilidad estimada), Madrid Nuevo Norte, cercanía a Azca.' },
    { name: 'Retiro', reason: 'Mayor crecimiento de precios (27% en el año), demanda de lujo, Parque del Retiro.' },
    { name: 'Latina', reason: 'Mayor inversión pública de la ciudad (89,5 M€), soterramiento A-5, crecimiento 9,3%.' },
    { name: 'Usera', reason: 'Precios aún accesibles, subida 19,5%, ampliación Madrid Río, Chinatown.' },
    { name: 'Villaverde', reason: 'Alta rentabilidad bruta (10%+ en zonas como San Cristóbal), precios bajos, buena conexión.' },
  ]

  // Normalizar nombres para cruce (quitar acentos, lowercase)
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\u0301/g, '').replace(/-/g, ' ')
  const top5NombresNorm = new Set(top5TusDatos.map((b) => norm(b.name)))

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>← Volver al Gestor</Link>
          <h1 className={styles.title}>🏘️ Dónde comprar: recomendaciones</h1>
          <p className={styles.subtitle}>
            Combina tus datos guardados con el contexto de mercado 2026 para decidir qué barrio visitar primero.
          </p>
        </header>

        {loading && (
          <section className={styles.section}>
            <p className={styles.loading}>Cargando tus datos…</p>
          </section>
        )}

        {!loading && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Top 5 según tus datos</h2>
              <p className={styles.intro}>
                Orden de barrios por <strong>rentabilidad calculada</strong> y <strong>fiabilidad del dato</strong> (más anuncios y más tramos de habitaciones = más fiable). Son los que en tu base de datos ofrecen mejor ratio alquiler/compra con un mínimo de consistencia.
              </p>
              {top5TusDatos.length === 0 ? (
                <p className={styles.noData}>
                  No hay barrios con rentabilidad calculada (hacen falta anuncios de alquiler y compra con habitaciones en el mismo barrio). Añade más pisos o revisa los filtros en la página principal.
                </p>
              ) : (
                <ol className={styles.rankingList}>
                  {top5TusDatos.map((b, i) => (
                    <li key={b.name} className={styles.rankingItem}>
                      <span className={styles.rank}>#{i + 1}</span>
                      <div className={styles.rankContent}>
                        <strong>{b.name}</strong>
                        <span className={styles.rankStats}>
                          Rentabilidad {b.profitability.toFixed(2)}% · Fiabilidad {b.reliability}% · {b.total} anuncios
                        </span>
                        {barrios2026.some((x) => norm(x.name) === norm(b.name)) && (
                          <span className={styles.badge2026}>También destacado en análisis 2026</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Contexto 2026: barrios con mejor perspectiva</h2>
              <p className={styles.intro}>
                Según informes y análisis del sector (20minutos, Madrid Max Gestión, estudios de rentabilidad), estos barrios aparecen como los de mayor potencial para comprar o invertir en 2026. Úsalos para contrastar con tu Top 5 y priorizar visitas.
              </p>
              <ul className={styles.contextList}>
                {barrios2026.map((b) => (
                  <li key={b.name} className={styles.contextItem}>
                    <strong>{b.name}</strong>: {b.reason}
                  </li>
                ))}
              </ul>
              <p className={styles.disclaimer}>
                Fuentes aproximadas: prensa y gestores inmobiliarios (dic 2025 – ene 2026). El mercado varía; conviene contrastar con tu propia búsqueda y asesoría.
              </p>
            </section>

            <section className={styles.sectionHighlight}>
              <h2 className={styles.sectionTitle}>Top 5 recomendado: por dónde empezar</h2>
              <p className={styles.intro}>
                Recomendación práctica: <strong>visita primero los barrios de tu Top 5 que además coinciden con el contexto 2026</strong> (marcados arriba). Si no hay coincidencias, prioriza tu Top 5 por datos; si un barrio solo sale en 2026 y no en tus datos, considéralo como siguiente opción una vez tengas más anuncios de esa zona.
              </p>
              {top5TusDatos.length > 0 ? (
                <div className={styles.recomendacionFinal}>
                  <p>
                    Empieza por: <strong>{top5TusDatos.map((b) => b.name).join(' → ')}</strong> (en ese orden según tus datos).
                  </p>
                  {top5TusDatos.some((b) => barrios2026.some((x) => norm(x.name) === norm(b.name))) ? (
                    <p className={styles.coincidencias}>
                      Los que también aparecen en análisis 2026 son buena prioridad: combinan buena rentabilidad en tu muestra con perspectiva de mercado actual.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className={styles.noData}>
                  Con los datos actuales no se puede generar un Top 5. Añade pisos de alquiler y compra con barrio y habitaciones para ver recomendaciones.
                </p>
              )}
            </section>
          </>
        )}

        <section className={styles.section}>
          <Link href="/" className={styles.backButton}>Volver al Gestor de Pisos</Link>
        </section>
      </div>
    </div>
  )
}

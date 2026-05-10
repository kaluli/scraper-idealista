import type { Metadata } from 'next'
import { rankingZonasInversion } from './data'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Noticias | FlashProp',
  description: 'Ranking informativo de zonas, rentabilidad y perfiles de inversión',
}

function IconNoticiasHeader() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 14h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 18h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 6h8v4h-8V6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function NoticiasPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} aria-hidden />
            <span>Mercado</span>
          </p>
          <h1 className={styles.h1Row}>
            <span className={styles.h1IconBadge} aria-hidden>
              <IconNoticiasHeader />
            </span>
            <span className={styles.h1TextBlock}>
              Noticias{' '}
              <span className={styles.h1Grad}>y zonas</span>
            </span>
          </h1>
          <p className={styles.subtitle}>
            Ranking orientativo de rentabilidad, ocupación y perfiles de inversión por zona.
          </p>
        </header>

        <div className={styles.card}>
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Tabla de zonas e inversión (escritorio)"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Puesto</th>
                  <th scope="col">Ciudad / Zona</th>
                  <th scope="col">Rentabilidad bruta</th>
                  <th scope="col">Tasa okupación</th>
                  <th scope="col">Perfil de inversión</th>
                </tr>
              </thead>
              <tbody>
                {rankingZonasInversion.map((row) => (
                  <tr key={row.puesto}>
                    <td className={styles.colPuesto}>{row.puesto}</td>
                    <td className={styles.colZona}>{row.ciudadZona}</td>
                    <td className={styles.colRent}>{row.rentabilidadBruta}</td>
                    <td className={styles.colOkup}>{row.tasaOkupacion}</td>
                    <td className={styles.colPerfil}>{row.perfilInversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ol className={styles.mobileStack} aria-label="Ranking por zonas (móvil)">
            {rankingZonasInversion.map((row) => (
              <li key={row.puesto} className={styles.mobileItem}>
                <div className={styles.mobileItemTop}>
                  <span className={styles.puestoPill} aria-label={`Puesto ${row.puesto}`}>
                    #{row.puesto}
                  </span>
                  <p className={styles.zonaName}>{row.ciudadZona}</p>
                </div>
                <dl className={styles.mobileGrid}>
                  <div className={styles.mobileRow}>
                    <dt>Rentabilidad bruta</dt>
                    <dd className={styles.valAccent}>{row.rentabilidadBruta}</dd>
                  </div>
                  <div className={styles.mobileRow}>
                    <dt>Tasa okupación</dt>
                    <dd>{row.tasaOkupacion}</dd>
                  </div>
                  <div className={`${styles.mobileRow} ${styles.mobileRowFull}`}>
                    <dt>Perfil de inversión</dt>
                    <dd className={styles.perfilText}>{row.perfilInversion}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { rankingZonasInversion } from './data'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Noticias | Idealista Manager',
  description: 'Ranking informativo de zonas, rentabilidad y perfiles de inversión',
}

export default function NoticiasPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Noticias</h1>

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

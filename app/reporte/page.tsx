'use client'

import Link from 'next/link'
import styles from './page.module.css'

export default function ReportePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>← Volver al Gestor</Link>
          <h1 className={styles.title}>📋 Reporte: Rentabilidad y criterios</h1>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>¿Por qué algunos barrios tienen más rentabilidad que otros?</h2>
          <p>
            La rentabilidad que se muestra <strong>no compara un mismo piso en alquiler vs compra</strong>, sino
            los <strong>precios medios del barrio</strong> agrupados por número de habitaciones. Por eso un barrio
            puede salir con mayor % que otro por varias razones:
          </p>
          <ul>
            <li><strong>Diferencia entre precios de alquiler y compra:</strong> Si en un barrio el alquiler está alto respecto al precio de venta (poca oferta de alquiler, mucha demanda), el porcentaje sube. Si la vivienda está muy cara de compra pero el alquiler no sube igual, el % baja.</li>
            <li><strong>Composición del parque:</strong> Barrios con muchos pisos pequeños (estudios, 1 hab) pueden tener un % distinto a barrios con más pisos grandes, porque se promedian rentabilidades por tramo de habitaciones.</li>
            <li><strong>Oferta y demanda local:</strong> Zonas con más demanda de alquiler que de compra (o al revés) desplazan precios y por tanto el ratio alquiler/compra.</li>
            <li><strong>Cantidad de datos:</strong> Con pocos anuncios, los promedios son más inestables; la fiabilidad del dato es menor (ver apartado de índice de fiabilidad).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>¿Bajo qué circunstancias se compara? ¿Es “la misma propiedad”?</h2>
          <p>
            <strong>No se compara la misma propiedad</strong> (un piso concreto en venta vs el mismo en alquiler). Lo que se hace es:
          </p>
          <ul>
            <li>En cada barrio se agrupan los anuncios de <strong>alquiler</strong> por número de habitaciones (1, 2, 3, …).</li>
            <li>Se agrupan los anuncios de <strong>compra</strong> por el mismo criterio.</li>
            <li>Para cada número de habitaciones que exista en <strong>ambos</strong> tipos (alquiler y compra), se calcula una rentabilidad: precio medio de alquiler mensual vs precio medio de compra para ese tramo.</li>
            <li>La rentabilidad que ves por barrio es el <strong>promedio</strong> de esas rentabilidades (una por cada tramo de habitaciones con datos en alquiler y compra).</li>
          </ul>
          <p>
            Es decir: se compara <strong>tipología similar</strong> (mismo número de habitaciones dentro del mismo barrio), no un inmueble concreto. Así se evita mezclar estudios con pisos de 4 habitaciones y se obtiene un indicador más coherente por barrio.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Criterio exacto para calcular la rentabilidad anual</h2>
          <p>El cálculo que usa la aplicación es el siguiente:</p>
          <ol className={styles.numberedList}>
            <li>Para cada barrio se toman solo los pisos que tienen <strong>precio &gt; 0</strong> y <strong>número de habitaciones informado</strong> (alquiler y compra por separado).</li>
            <li>Se agrupan por <strong>habitaciones</strong>: por ejemplo, todos los de 2 hab en alquiler en ese barrio y todos los de 2 hab en compra en ese barrio.</li>
            <li>Para cada número de habitaciones que tenga <strong>al menos un anuncio en alquiler y al menos uno en compra</strong>:
              <ul>
                <li>Se calcula el <strong>precio medio de alquiler mensual</strong> (€/mes) para ese tramo.</li>
                <li>Se calcula el <strong>precio medio de compra</strong> (€) para ese tramo.</li>
                <li><strong>Rentabilidad de ese tramo (%)</strong> = (Alquiler mensual × 12) / Precio compra × 100.</li>
              </ul>
            </li>
            <li>La <strong>rentabilidad del barrio</strong> es el <strong>promedio</strong> de las rentabilidades de todos los tramos de habitaciones calculados en ese barrio. Si solo hay un tramo (p. ej. solo 2 hab), ese único % es el que se muestra.</li>
          </ol>
          <p className={styles.formula}>
            En fórmula: para cada tramo de habitaciones, <strong>Rentabilidad (%) = (Alquiler_medio_mensual × 12 / Precio_compra_medio) × 100</strong>. La rentabilidad por barrio es la media de estos porcentajes.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Índice de fiabilidad (%)</h2>
          <p>
            El <strong>índice de fiabilidad</strong> indica qué tan fiable es el porcentaje de rentabilidad mostrado para ese barrio. No es una precisión estadística exacta, sino un indicador basado en:
          </p>
          <ul>
            <li><strong>Cantidad de anuncios:</strong> Cuantos más pisos de alquiler y compra haya en el barrio, más estables son los promedios y más fiable el resultado.</li>
            <li><strong>Número de tramos de habitaciones usados:</strong> Si la rentabilidad se calcula con varios tramos (p. ej. 1, 2 y 3 habitaciones), el promedio es más representativo que si solo hay un tramo.</li>
          </ul>
          <p>
            La aplicación calcula el índice así: <strong>25% base + 1,2 × (total de anuncios de alquiler + compra en el barrio) + 12 × (número de tramos de habitaciones usados)</strong>, con un máximo de <strong>100%</strong>. Ejemplos:
          </p>
          <ul>
            <li>Pocos anuncios y un solo tramo → fiabilidad baja (p. ej. 40–50%).</li>
            <li>Muchos anuncios y varios tramos (2–3 habitaciones) → fiabilidad alta (p. ej. 80–100%).</li>
          </ul>
          <p>
            Un barrio con <strong>fiabilidad alta</strong> da más confianza en que el % de rentabilidad se acerque a lo que podrías encontrar en ese barrio. Uno con <strong>fiabilidad baja</strong> puede variar mucho si se añaden o quitan pocos anuncios.
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.footerNote}>
            Este criterio es el mismo que se aplica en la sección <strong>«Por barrio»</strong> de la página principal. Para ver los datos y el índice de fiabilidad por barrio, usa los filtros (provincia, tipo, etc.) y revisa la tarjeta de cada barrio.
          </p>
          <Link href="/" className={styles.backButton}>Volver al Gestor de Pisos</Link>
        </section>
      </div>
    </div>
  )
}

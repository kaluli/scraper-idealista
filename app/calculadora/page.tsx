'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

function formatEuros(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n)
}

function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`
}

/** Cuota mensual hipoteca: P * r * (1+r)^n / ((1+r)^n - 1) */
function cuotaHipotecaria(principal: number, interesAnual: number, anos: number): number {
  if (principal <= 0 || anos <= 0) return 0
  const r = interesAnual / 100 / 12
  const n = anos * 12
  if (r === 0) return principal / n
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
}

export default function CalculadoraPage() {
  const [precioCompra, setPrecioCompra] = useState<string>('180000')
  const [alquilerMensual, setAlquilerMensual] = useState<string>('1000')
  const [reformaInicial, setReformaInicial] = useState<string>('0')
  const [conHipoteca, setConHipoteca] = useState<boolean>(false)

  const [entradaPct, setEntradaPct] = useState<string>('30')
  const [tipoInteres, setTipoInteres] = useState<string>('2.4')
  const [plazoAnos, setPlazoAnos] = useState<string>('25')

  const [gastosCompraPct, setGastosCompraPct] = useState<string>('10')
  const [ibiAnual, setIbiAnual] = useState<string>('500')
  const [comunidadMensual, setComunidadMensual] = useState<string>('50')
  const [seguroAnual, setSeguroAnual] = useState<string>('250')
  const [mantenimientoPct, setMantenimientoPct] = useState<string>('5')
  const [vacanciaPct, setVacanciaPct] = useState<string>('5')

  const precio = parseFloat(precioCompra) || 0
  const alquiler = parseFloat(alquilerMensual) || 0
  const reforma = parseFloat(reformaInicial) || 0
  const entradaP = parseFloat(entradaPct) || 0
  const interes = parseFloat(tipoInteres) || 0
  const plazo = parseFloat(plazoAnos) || 0
  const gastosCompraP = parseFloat(gastosCompraPct) || 0
  const ibi = parseFloat(ibiAnual) || 0
  const comunidad = parseFloat(comunidadMensual) || 0
  const seguro = parseFloat(seguroAnual) || 0
  const mantenimientoP = parseFloat(mantenimientoPct) || 0
  const vacanciaP = parseFloat(vacanciaPct) || 0

  const resultado = useMemo(() => {
    let ingresoAnualBruto = alquiler * 12
    let perdidaVacancia = ingresoAnualBruto * (vacanciaP / 100)
    let mantenimiento = ingresoAnualBruto * (mantenimientoP / 100)
    let comunidadAnual = comunidad * 12
    let gastosAnualesTotales = ibi + comunidadAnual + seguro + mantenimiento + perdidaVacancia
    let ingresoAnualNetoAntesHipoteca = ingresoAnualBruto - gastosAnualesTotales

    let gastosCompra = precio * (gastosCompraP / 100)
    let entrada = precio * (entradaP / 100)
    let inversionTotalInicial: number
    let cuotaMensual = 0
    let cashflowMensual = ingresoAnualNetoAntesHipoteca / 12
    let roi = 0

    if (conHipoteca) {
      let principal = precio - entrada
      cuotaMensual = cuotaHipotecaria(principal, interes, plazo)
      cashflowMensual = (ingresoAnualNetoAntesHipoteca / 12) - cuotaMensual
      inversionTotalInicial = entrada + gastosCompra + reforma
      let beneficioAnualReal = cashflowMensual * 12
      roi = inversionTotalInicial > 0 ? (beneficioAnualReal / inversionTotalInicial) * 100 : 0
    } else {
      inversionTotalInicial = precio + gastosCompra + reforma
      roi = inversionTotalInicial > 0 ? (ingresoAnualNetoAntesHipoteca / inversionTotalInicial) * 100 : 0
    }

    let rentabilidadBruta = precio > 0 ? (ingresoAnualBruto / precio) * 100 : 0
    const costeTotalInmueble = precio + gastosCompra + reforma
    let rentabilidadNeta = costeTotalInmueble > 0 ? (ingresoAnualNetoAntesHipoteca / costeTotalInmueble) * 100 : 0

    return {
      ingresoAnualBruto,
      gastosAnualesTotales,
      ingresoAnualNetoAntesHipoteca,
      cuotaMensual,
      cashflowMensual,
      rentabilidadBruta,
      rentabilidadNeta,
      roi,
      inversionTotalInicial,
    }
  }, [
    precio,
    alquiler,
    reforma,
    conHipoteca,
    entradaP,
    interes,
    plazo,
    gastosCompraP,
    ibi,
    comunidad,
    seguro,
    mantenimientoP,
    vacanciaP,
  ])

  const alertas: string[] = []
  if (resultado.cashflowMensual < 0) alertas.push('Atención: esta operación tiene cashflow negativo')
  if (resultado.rentabilidadNeta < 4 && resultado.rentabilidadNeta > 0) alertas.push('La rentabilidad neta es baja')
  if (conHipoteca && resultado.roi < 5 && resultado.roi > 0) alertas.push('Esta operación puede depender demasiado de la revalorización futura')

  let resumen = ''
  if (resultado.cashflowMensual < 0) resumen = 'Poco atractiva'
  else if (resultado.rentabilidadNeta >= 6 && resultado.cashflowMensual > 0) resumen = 'Buena rentabilidad'
  else if (resultado.rentabilidadNeta >= 4) resumen = 'Operación razonable'
  else resumen = 'Operación ajustada'

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>← Volver al Gestor</Link>
          <h1 className={styles.title}>🧮 Calculadora de rentabilidad</h1>
          <p className={styles.subtitle}>
            Analiza si un piso en alquiler tiene sentido como inversión. Rápido y visual.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos principales</h2>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Precio de compra (€)</label>
              <input
                type="number"
                value={precioCompra}
                onChange={(e) => setPrecioCompra(e.target.value)}
                min="0"
                step="1000"
              />
            </div>
            <div className={styles.field}>
              <label>Alquiler mensual esperado (€)</label>
              <input
                type="number"
                value={alquilerMensual}
                onChange={(e) => setAlquilerMensual(e.target.value)}
                min="0"
                step="50"
              />
            </div>
            <div className={styles.field}>
              <label>Reforma inicial (€)</label>
              <input
                type="number"
                value={reformaInicial}
                onChange={(e) => setReformaInicial(e.target.value)}
                min="0"
                step="500"
              />
            </div>
            <div className={styles.fieldCheck}>
              <label>
                <input
                  type="checkbox"
                  checked={conHipoteca}
                  onChange={(e) => setConHipoteca(e.target.checked)}
                />
                Hipoteca
              </label>
            </div>
          </div>

          {conHipoteca && (
            <div className={styles.hipotecaBlock}>
              <h3 className={styles.subsectionTitle}>Datos de la hipoteca</h3>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Entrada (%)</label>
                  <input
                    type="number"
                    value={entradaPct}
                    onChange={(e) => setEntradaPct(e.target.value)}
                    min="0"
                    max="100"
                    step="5"
                  />
                </div>
                <div className={styles.field}>
                  <label>Tipo de interés (%)</label>
                  <input
                    type="number"
                    value={tipoInteres}
                    onChange={(e) => setTipoInteres(e.target.value)}
                    min="0"
                    max="20"
                    step="0.1"
                  />
                </div>
                <div className={styles.field}>
                  <label>Plazo (años)</label>
                  <input
                    type="number"
                    value={plazoAnos}
                    onChange={(e) => setPlazoAnos(e.target.value)}
                    min="1"
                    max="40"
                    step="1"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Supuestos usados</h2>
          <p className={styles.intro}>Puedes modificar estos valores. Se usan para calcular gastos anuales.</p>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Gastos de compra (%)</label>
              <input
                type="number"
                value={gastosCompraPct}
                onChange={(e) => setGastosCompraPct(e.target.value)}
                min="0"
                max="20"
                step="0.5"
              />
            </div>
            <div className={styles.field}>
              <label>IBI anual (€)</label>
              <input
                type="number"
                value={ibiAnual}
                onChange={(e) => setIbiAnual(e.target.value)}
                min="0"
                step="50"
              />
            </div>
            <div className={styles.field}>
              <label>Comunidad mensual (€)</label>
              <input
                type="number"
                value={comunidadMensual}
                onChange={(e) => setComunidadMensual(e.target.value)}
                min="0"
                step="10"
              />
            </div>
            <div className={styles.field}>
              <label>Seguro anual (€)</label>
              <input
                type="number"
                value={seguroAnual}
                onChange={(e) => setSeguroAnual(e.target.value)}
                min="0"
                step="50"
              />
            </div>
            <div className={styles.field}>
              <label>Mantenimiento (%) del alquiler anual</label>
              <input
                type="number"
                value={mantenimientoPct}
                onChange={(e) => setMantenimientoPct(e.target.value)}
                min="0"
                max="20"
                step="0.5"
              />
            </div>
            <div className={styles.field}>
              <label>Vacancia anual (%)</label>
              <input
                type="number"
                value={vacanciaPct}
                onChange={(e) => setVacanciaPct(e.target.value)}
                min="0"
                max="30"
                step="0.5"
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Resultados</h2>
          <div className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Ingreso anual bruto</span>
              <span className={styles.resultValue}>{formatEuros(resultado.ingresoAnualBruto)}</span>
              <span className={styles.resultHint}>Alquiler anual antes de gastos</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Gastos anuales totales</span>
              <span className={styles.resultValue}>{formatEuros(resultado.gastosAnualesTotales)}</span>
              <span className={styles.resultHint}>IBI, comunidad, seguro, mantenimiento, vacancia</span>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>Ingreso anual neto (antes de hipoteca)</span>
              <span className={styles.resultValue}>{formatEuros(resultado.ingresoAnualNetoAntesHipoteca)}</span>
              <span className={styles.resultHint}>Lo que entra menos gastos</span>
            </div>
            {conHipoteca && (
              <div className={styles.resultCardCuota}>
                <span className={styles.resultLabel}>Cuota hipotecaria mensual</span>
                <span className={styles.resultValue}>{formatEuros(resultado.cuotaMensual)}</span>
              </div>
            )}
            <div className={styles.resultCardCashflow}>
              <span className={styles.resultLabel}>Cashflow mensual</span>
              <span className={`${styles.resultValue} ${resultado.cashflowMensual < 0 ? styles.negative : ''}`}>
                {formatEuros(resultado.cashflowMensual)}
              </span>
              <span className={styles.resultHint}>Lo que te queda cada mes</span>
            </div>
            <div className={styles.rentabilidadGroup}>
              <div className={styles.resultCardRentabilidad}>
                <span className={styles.resultLabel}>Rentabilidad bruta</span>
                <span className={styles.resultValueRentabilidad}>{formatPercent(resultado.rentabilidadBruta)}</span>
                <span className={styles.resultHint}>Ingreso bruto / precio compra</span>
              </div>
              <div className={styles.resultCardRentabilidad}>
                <span className={styles.resultLabel}>Rentabilidad neta</span>
                <span className={styles.resultValueRentabilidad}>{formatPercent(resultado.rentabilidadNeta)}</span>
                <span className={styles.resultHint}>Beneficio anual / coste total del inmueble (sin hipoteca)</span>
              </div>
            </div>
            <div className={styles.resultCard}>
              <span className={styles.resultLabel}>ROI sobre dinero aportado</span>
              <span className={styles.resultValue}>{formatPercent(resultado.roi)}</span>
              <span className={styles.resultHint}>Rendimiento sobre tu capital inicial</span>
            </div>
          </div>
        </section>

        {alertas.length > 0 && (
          <section className={styles.alertSection}>
            <h2 className={styles.sectionTitle}>⚠️ Alertas</h2>
            <ul className={styles.alertList}>
              {alertas.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.resumenSection}>
          <h2 className={styles.sectionTitle}>Resumen</h2>
          <p className={styles.resumenText}>{resumen}</p>
        </section>
      </div>
    </div>
  )
}

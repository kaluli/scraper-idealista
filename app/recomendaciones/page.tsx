'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function RecomendacionesPage() {
  const [importing, setImporting] = useState(false)
  const [importingSingle, setImportingSingle] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const singleFileInputRef = useRef<HTMLInputElement>(null)

  const handleImportHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.html')) {
      alert('Elegí un archivo .html (página guardada de Idealista).')
      return
    }
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import-html', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        let msg = `Importados: ${json.imported} | Omitidos (duplicados): ${json.skipped} | Total en archivo: ${json.total}`
        if (json.errorsCount > 0) {
          msg += `\n\n${json.errorsCount} anuncio(s) fallaron.`
          if (json.errors?.length) {
            msg += '\n' + json.errors.slice(0, 5).map((err: { error: string }) => `${err.error}`).join('\n')
            if (json.errorsCount > 5) msg += `\n... y ${json.errorsCount - 5} más`
          }
        }
        alert(msg)
      } else {
        alert(json.error || 'Error al importar')
      }
    } catch {
      alert('Error al importar el archivo')
    } finally {
      setImporting(false)
    }
  }

  const handleImportSingleHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.html')) {
      alert('Elegí un archivo .html (página de detalle guardada de Idealista).')
      return
    }
    setImportingSingle(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import-single-html', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        if (json.skipped) {
          alert('Este anuncio ya está en la base de datos (omitido).')
        } else {
          alert(json.message || 'Piso importado correctamente.')
        }
      } else {
        alert(json.error || 'Error al importar')
      }
    } catch {
      alert('Error al importar el archivo')
    } finally {
      setImportingSingle(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.breadcrumb} aria-label="Migas de navegación">
          <Link href="/" className={styles.breadcrumbLink}>
            ← Inicio / gestor
          </Link>
        </nav>

        <header className={styles.pageHeader}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} aria-hidden />
            <span>Importación</span>
          </p>
          <h1 className={styles.h1}>
            Ajustes
            <span className={styles.h1Grad}> e importación</span>
          </h1>
          <p className={styles.subtitle}>
            Cargá archivos .html exportados de Idealista para añadir anuncios a la base, sin
            duplicar enlaces existentes.
          </p>
        </header>

        <section className={styles.card} aria-labelledby="ajustes-listado-title">
          <h2 id="ajustes-listado-title" className={styles.cardTitle}>
            Listado (varios anuncios)
          </h2>
          <p className={styles.cardText}>
            Archivo <strong>.html</strong> de una búsqueda o listado en Idealista. Se importan
            múltiples anuncios; los duplicados (mismo enlace) se omiten.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            accept=".html"
            className={styles.hiddenFileInput}
            onChange={handleImportHtml}
            aria-label="Seleccionar archivo HTML de listado"
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importando…' : 'Importar desde listado HTML'}
          </button>
        </section>

        <section className={styles.card} aria-labelledby="ajustes-ficha-title">
          <h2 id="ajustes-ficha-title" className={styles.cardTitle}>
            Ficha (un anuncio)
          </h2>
          <p className={styles.cardText}>
            <strong>.html</strong> de la página de detalle de un piso (guardar página en el
            navegador). Si el enlace ya existe, se omite.
          </p>
          <input
            type="file"
            ref={singleFileInputRef}
            accept=".html"
            className={styles.hiddenFileInput}
            onChange={handleImportSingleHtml}
            aria-label="Seleccionar archivo HTML de ficha de detalle"
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={importingSingle}
            onClick={() => singleFileInputRef.current?.click()}
          >
            {importingSingle ? 'Importando…' : 'Importar ficha (un piso)'}
          </button>
        </section>
      </div>
    </div>
  )
}

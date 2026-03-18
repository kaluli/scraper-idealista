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
            msg += '\n' + json.errors.slice(0, 5).map((err: { link: string; error: string }) => `${err.error}`).join('\n')
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
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerLinks}>
            <Link href="/" className={styles.backLink}>← Volver al Gestor</Link>
            <Link href="/calculadora" className={styles.backLink}>🧮 Calculadora</Link>
          </div>
          <h1 className={styles.title}>🏘️ Ajustes</h1>
          <p className={styles.subtitle}>
            Importar pisos desde archivos HTML guardados de Idealista.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📥 Importar pisos desde HTML</h2>
          <p className={styles.intro}>
            Subí un archivo .html guardado desde Idealista (lista de búsqueda) para importar varios anuncios. Los duplicados (mismo link) se omiten.
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
            {importing ? 'Importando…' : '📥 Importar pisos desde HTML'}
          </button>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📄 Importar un solo piso desde HTML</h2>
          <p className={styles.intro}>
            Subí el archivo .html de la página de detalle de un anuncio (guardá la página del piso en Idealista). Los duplicados se omiten.
          </p>
          <input
            type="file"
            ref={singleFileInputRef}
            accept=".html"
            className={styles.hiddenFileInput}
            onChange={handleImportSingleHtml}
            aria-label="Seleccionar archivo HTML de detalle"
          />
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={importingSingle}
            onClick={() => singleFileInputRef.current?.click()}
          >
            {importingSingle ? 'Importando…' : '📄 Importar un solo piso desde HTML'}
          </button>
        </section>

        <section className={styles.section}>
          <Link href="/" className={styles.backButton}>Volver al Gestor de Pisos</Link>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import styles from './AppTopHeader.module.css'

type State = 'loading' | 'ok' | 'error'

type HeaderDbPillProps = { className?: string; statusLabel?: string }

export function HeaderDbPill({ className, statusLabel = 'OK' }: HeaderDbPillProps) {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/health/db', { cache: 'no-store' })
        const json = await res.json()
        if (cancelled) return
        setState(json?.ok === true ? 'ok' : 'error')
      } catch {
        if (!cancelled) setState('error')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return (
      <span
        className={cn(styles.dbPill, className)}
        aria-live="polite"
        title="Comprobando base de datos"
      >
        <span className={styles.dbPillIcon} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 12 22A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 12 15A9 3 0 0 0 21 12" />
          </svg>
        </span>
        <span className={styles.dbPillMuted}>…</span>
      </span>
    )
  }

  if (state === 'error') {
    return (
      <a
        href="/api/health/db"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(styles.dbPill, styles.dbPillError, className)}
        title="Ver diagnóstico de la base de datos"
        aria-label="Base de datos: error. Ver diagnóstico"
      >
        <span className={styles.dbDot} aria-hidden />
        <span className={styles.dbPillIcon} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 12 22A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 12 15A9 3 0 0 0 21 12" />
          </svg>
        </span>
        <span>Error</span>
      </a>
    )
  }

  return (
    <span
      className={cn(styles.dbPill, className)}
      title="Base de datos: conexión correcta"
      aria-label="Base de datos: OK"
    >
      <span className={styles.dbDot} aria-hidden />
      <span className={styles.dbPillIcon} aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5V19A9 3 0 0 0 12 22A9 3 0 0 0 21 19V5" />
          <path d="M3 12A9 3 0 0 0 12 15A9 3 0 0 0 21 12" />
        </svg>
      </span>
      <span>{statusLabel}</span>
    </span>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MobileNavTrigger } from '@/components/MobileAppNav'
import { IconBuilding2 } from '@/components/icons/IconBuilding2'
import { cn } from '@/lib/utils'
import { HeaderDbPill } from '@/components/HeaderDbPill'
import styles from './AppTopHeader.module.css'

function IconContactos({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <circle cx="12" cy="15" r="2" />
      <path d="M9 20h6" />
    </svg>
  )
}

function IconCalculadora({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <rect x="6" y="6" width="12" height="4" rx="1" fill="currentColor" fillOpacity="0.12" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="10" y2="18" />
      <line x1="14" y1="18" x2="16" y2="18" />
    </svg>
  )
}

function IconNoticias({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6z" />
    </svg>
  )
}

function IconAjustes({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

export function AppTopHeader() {
  const pathname = usePathname()
  const isGestor = pathname === '/'
  const isContactos = pathname === '/contactos' || pathname.startsWith('/contactos/')
  const isCalculadora = pathname === '/calculadora' || pathname.startsWith('/calculadora/')
  const isNoticias = pathname === '/noticias' || pathname.startsWith('/noticias/')
  const isAjustes = pathname === '/recomendaciones' || pathname.startsWith('/recomendaciones/')

  return (
    <header className={styles.root} role="banner">
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Inicio — Idealista Manager">
          <span className={styles.brandMark} aria-hidden>
            <IconBuilding2 size={18} className={styles.brandMarkSvg} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandNameLine}>
              <span className={styles.brandNameIdea}>Idea</span>
              <span className={styles.brandNameLista}>lista</span>
              <span className={styles.brandNameManager}>Manager</span>
            </span>
            <span className={styles.brandSub}>Real Estate Suite</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Secciones principales">
          <Link
            href="/"
            className={cn(styles.navPill, isGestor && styles.navPillActive)}
            aria-current={isGestor ? 'page' : undefined}
          >
            <span className={styles.navPillIcon}>
              <IconBuilding2 size={20} />
            </span>
            Gestor
          </Link>
          <Link
            href="/contactos"
            className={cn(styles.navPill, isContactos && styles.navPillActive)}
            aria-current={isContactos ? 'page' : undefined}
          >
            <span className={styles.navPillIcon}>
              <IconContactos />
            </span>
            Contactos
          </Link>
          <Link
            href="/calculadora"
            className={cn(styles.navPill, isCalculadora && styles.navPillActive)}
            aria-current={isCalculadora ? 'page' : undefined}
          >
            <span className={styles.navPillIcon}>
              <IconCalculadora />
            </span>
            Calculadora
          </Link>
          <Link
            href="/noticias"
            className={cn(styles.navPill, isNoticias && styles.navPillActive)}
            aria-current={isNoticias ? 'page' : undefined}
          >
            <span className={styles.navPillIcon}>
              <IconNoticias />
            </span>
            Noticias
          </Link>
        </nav>

        <div className={styles.right}>
          <div className={styles.burgerOnly} aria-label="Más secciones">
            <MobileNavTrigger />
          </div>
          <div className={styles.rightExtras}>
            <Link
              href="/recomendaciones"
              className={cn(styles.headerIconLink, isAjustes && styles.headerIconLinkActive)}
              aria-label="Ajustes"
              title="Ajustes"
              aria-current={isAjustes ? 'page' : undefined}
            >
              <IconAjustes />
            </Link>
            <HeaderDbPill />
            <span className={styles.avatar} title="Cuenta" aria-label="Cuenta">
              IP
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

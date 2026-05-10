'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Silueta usuario (login / cuenta). */
function IconUser({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  )
}

/** Varias cuentas — gestión de usuarios (solo admin). */
function IconUsers({ className }: { className?: string }) {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function UserAccountMenu({ isPerfil }: { isPerfil: boolean }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.userMenu} ref={wrapRef}>
      <button
        type="button"
        className={cn(
          styles.headerIconLink,
          styles.userMenuTrigger,
          open && styles.userMenuTriggerOpen,
          isPerfil && styles.headerIconLinkActive
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Menú de cuenta"
        onClick={() => setOpen((v) => !v)}
      >
        <IconUser />
      </button>
      {open ? (
        <div
          id={menuId}
          className={styles.userMenuPanel}
          role="menu"
          aria-orientation="vertical"
        >
          <Link
            href="/perfil"
            role="menuitem"
            className={styles.userMenuItem}
            aria-current={isPerfil ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            Perfil
          </Link>
          <button
            type="button"
            role="menuitem"
            className={cn(styles.userMenuItem, styles.userMenuItemDanger)}
            onClick={() => {
              setOpen(false)
              void signOut({ callbackUrl: '/' })
            }}
          >
            Salir
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AppTopHeader() {
  const pathname = usePathname()
  const { data: session, status: authStatus } = useSession()
  const isGestor = pathname === '/'
  const isContactos = pathname === '/contactos' || pathname.startsWith('/contactos/')
  const isCalculadora = pathname === '/calculadora' || pathname.startsWith('/calculadora/')
  const isNoticias = pathname === '/noticias' || pathname.startsWith('/noticias/')
  const isAdminUsuarios =
    pathname === '/admin/usuarios' || pathname.startsWith('/admin/usuarios/')
  const isAjustes = pathname === '/recomendaciones' || pathname.startsWith('/recomendaciones/')
  const isPerfil = pathname === '/perfil' || pathname.startsWith('/perfil/')

  return (
    <header className={styles.root} role="banner">
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="Inicio — FlashProp">
          <span className={styles.brandMark} aria-hidden>
            <IconBuilding2 size={18} className={styles.brandMarkSvg} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandNameLine}>
              <span className={styles.brandNameFlash}>Flash</span>
              <span className={styles.brandNameProp}>Prop</span>
            </span>
            <span className={styles.brandSub}>Real Estate Manager</span>
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
          {session?.user?.role === 'admin' ? (
            <Link
              href="/admin/usuarios"
              className={cn(styles.navPill, isAdminUsuarios && styles.navPillActive)}
              aria-current={isAdminUsuarios ? 'page' : undefined}
            >
              <span className={styles.navPillIcon}>
                <IconUsers />
              </span>
              Usuarios
            </Link>
          ) : null}
        </nav>

        <div className={styles.right}>
          <div className={styles.authMobile}>
            {authStatus === 'loading' ? null : session ? (
              <UserAccountMenu isPerfil={isPerfil} />
            ) : (
              <Link href="/login" className={cn(styles.authLink, styles.authLinkLogin)}>
                <IconUser className={styles.authLinkIcon} />
                Entrar
              </Link>
            )}
          </div>
          <div className={styles.burgerOnly} aria-label="Más secciones">
            <MobileNavTrigger />
          </div>
          <div className={styles.rightExtras}>
            {authStatus === 'loading' ? null : session ? (
              <UserAccountMenu isPerfil={isPerfil} />
            ) : (
              <Link href="/login" className={cn(styles.authLink, styles.authLinkLogin)}>
                <IconUser className={styles.authLinkIcon} />
                Entrar
              </Link>
            )}
            {session?.user?.role === 'admin' ? (
              <Link
                href="/recomendaciones"
                className={cn(styles.headerIconLink, isAjustes && styles.headerIconLinkActive)}
                aria-label="Ajustes"
                title="Ajustes"
                aria-current={isAjustes ? 'page' : undefined}
              >
                <IconAjustes />
              </Link>
            ) : null}
            {session?.user?.role === 'admin' ? <HeaderDbPill /> : null}
          </div>
        </div>
      </div>
    </header>
  )
}

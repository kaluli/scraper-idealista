'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { IconBuilding2 } from '@/components/icons/IconBuilding2'
import styles from './MobileAppNav.module.css'

function IconX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconContactosNav({ className }: { className?: string }) {
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

function IconUsersNav({ className }: { className?: string }) {
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

/** Móvil: Gestor → Contactos → Calculadora → Noticias; Usuarios y Ajustes solo admin */
const coreNavItems = [
  { href: '/', label: 'Gestor', type: 'gestor' as const },
  { href: '/contactos', label: 'Contactos', type: 'contactos' as const },
  { href: '/calculadora', label: 'Calculadora', type: 'calculadora' as const },
  { href: '/noticias', label: 'Noticias', type: 'noticias' as const },
] as const

type NavItem =
  | (typeof coreNavItems)[number]
  | { href: '/recomendaciones'; label: 'Ajustes'; type: 'ajustes' }
  | { href: '/admin/usuarios'; label: 'Usuarios'; type: 'admin' }

function MobileNavItemIcon({ item }: { item: NavItem }) {
  const ic = styles.drawerLinkIcon
  if (item.type === 'gestor') {
    return (
      <span className={styles.drawerLinkIconWrap} aria-hidden>
        <IconBuilding2 size={20} className={ic} />
      </span>
    )
  }
  if (item.type === 'calculadora') {
    return (
      <span className={styles.drawerLinkIconWrap} aria-hidden>
        <IconCalculadora className={ic} />
      </span>
    )
  }
  if (item.type === 'noticias') {
    return (
      <span className={styles.drawerLinkIconWrap} aria-hidden>
        <IconNoticias className={ic} />
      </span>
    )
  }
  if (item.type === 'ajustes') {
    return (
      <span className={styles.drawerLinkIconWrap} aria-hidden>
        <IconAjustes className={ic} />
      </span>
    )
  }
  if (item.type === 'admin') {
    return (
      <span className={styles.drawerLinkIconWrap} aria-hidden>
        <IconUsersNav className={ic} />
      </span>
    )
  }
  return (
    <span className={styles.drawerLinkIconWrap} aria-hidden>
      <IconContactosNav className={ic} />
    </span>
  )
}

type MobileNavCtx = {
  open: boolean
  setOpen: (v: boolean | ((b: boolean) => boolean)) => void
  close: () => void
  titleId: string
}

const MobileNavContext = createContext<MobileNavCtx | null>(null)

export function useMobileNav() {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider')
  return ctx
}

/** Disparador hamburguesa (mismo criterio que el makeover Header: rounded-xl, border, card) */
export function MobileNavTrigger({ className }: { className?: string }) {
  const { open, setOpen, titleId } = useMobileNav()
  return (
    <button
      type="button"
      className={[styles.hamburger, className].filter(Boolean).join(' ')}
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={open}
      aria-controls={titleId}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? <IconX className={styles.hamburgerIcon} /> : <HamburgerIcon />}
    </button>
  )
}

function HamburgerIcon() {
  return (
    <span className={styles.hamburgerBars} aria-hidden>
      <span className={styles.hamburgerBar} />
      <span className={styles.hamburgerBar} />
      <span className={styles.hamburgerBar} />
    </span>
  )
}

function MobileNavChrome() {
  return null
}

function MobileNavOverlay() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { open, close, titleId } = useMobileNav()

  const drawerItems: NavItem[] = useMemo(() => {
    const list: NavItem[] = [...coreNavItems]
    if (session?.user?.role === 'admin') {
      list.push({
        href: '/admin/usuarios',
        label: 'Usuarios',
        type: 'admin',
      })
      list.push({
        href: '/recomendaciones',
        label: 'Ajustes',
        type: 'ajustes',
      })
    }
    return list
  }, [session?.user?.role])

  if (!open) return null
  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Cerrar menú" onClick={close} />
      <div className={styles.drawerPositioner} role="presentation">
        <nav
          className={styles.drawer}
          id={titleId}
          role="dialog"
          aria-label="Navegación de la app"
          aria-modal="true"
        >
          <div className={styles.drawerCard}>
            <div className={styles.drawerTop}>
              <div className={styles.drawerBrand}>
                <div className={styles.drawerBrandMark} aria-hidden>
                  <IconBuilding2 size={18} className={styles.drawerBrandMarkSvg} />
                </div>
                <div className={styles.drawerBrandText}>
                  <p className={styles.drawerBrandName}>
                    <span className={styles.brandFlash}>Flash</span>
                    <span className={styles.brandProp}>Prop</span>
                  </p>
                  <p className={styles.drawerBrandSub}>Real Estate Manager</p>
                </div>
              </div>
              <button type="button" className={styles.drawerClose} onClick={close} aria-label="Cerrar menú">
                <IconX />
              </button>
            </div>
            <div className={styles.drawerDivider} aria-hidden />
            <div className={styles.drawerNav}>
              {drawerItems.map((item) => {
                const current =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={
                      current
                        ? `${styles.drawerLink} ${styles.drawerLinkCurrent}`
                        : styles.drawerLink
                    }
                    aria-current={current ? 'page' : undefined}
                  >
                    <MobileNavItemIcon item={item} />
                    <span className={styles.drawerLinkLabel}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const titleId = useId()
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const value: MobileNavCtx = { open, setOpen, close, titleId }

  return (
    <MobileNavContext.Provider value={value}>
      <MobileNavChrome />
      {children}
      <MobileNavOverlay />
    </MobileNavContext.Provider>
  )
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconBuilding2 } from '@/components/icons/IconBuilding2'
import { HeaderDbPill } from '@/components/HeaderDbPill'
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

/** Criterio alineado con el header desktop + Idealista Manager / makeover */
const items = [
  { href: '/', label: 'Gestor', type: 'gestor' as const },
  { href: '/calculadora', label: 'Calculadora', type: 'calculadora' as const },
  { href: '/noticias', label: 'Noticias', type: 'noticias' as const },
  { href: '/recomendaciones', label: 'Ajustes', type: 'ajustes' as const },
  { href: '/contactos', label: 'Contactos', type: 'contactos' as const },
] as const

type NavItem = (typeof items)[number]

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
  const { open, close, titleId } = useMobileNav()
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
                    <span className={styles.brandIdea}>Idea</span>
                    <span className={styles.brandLista}>lista</span>
                    <span className={styles.brandManager}>Manager</span>
                  </p>
                  <p className={styles.drawerBrandSub}>Real Estate Suite</p>
                </div>
              </div>
              <button type="button" className={styles.drawerClose} onClick={close} aria-label="Cerrar menú">
                <IconX />
              </button>
            </div>
            <div className={styles.drawerDivider} aria-hidden />
            <div className={styles.drawerNav}>
              {items.map((item) => {
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
            <div className={styles.drawerDbWrap}>
              <HeaderDbPill statusLabel="DB conectada" />
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

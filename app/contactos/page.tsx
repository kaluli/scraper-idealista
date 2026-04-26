'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IdealistaLinkIcon } from '../../components/IdealistaLinkIcon'
import styles from './page.module.css'


/** Horas en bloques de 10 min para el selector de cita (solo 07:00–21:50, no 22h–07h). */
const TIME_SLOTS_10: string[] = []
for (let h = 7; h < 22; h++) {
  for (let m = 0; m < 60; m += 10) {
    TIME_SLOTS_10.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

interface Listing {
  id: number
  title: string | null
  price: number
  surface: number | null
  link: string
  type: 'alquiler' | 'compra'
  neighborhood: string | null
  city: string | null
  province: string | null
  publishedAddress: string | null
  rooms: number | null
  citaAt: string | null
  contacto: string | null
  phone: string | null
  notas: string | null
  profitabilityRate?: number | null
  llamado?: boolean
  visitado?: boolean
}

/** Misma “zona” que en la página: Comunidad de Madrid agrupada; resto por provincia. */
function sameBarrioYProvincia(a: Listing, b: Listing): boolean {
  const na = a.neighborhood?.trim() || ''
  const nb = b.neighborhood?.trim() || ''
  if (!na || !nb || na !== nb) return false
  const aM =
    a.province === 'Madrid' || a.province === 'Alcalá de Henares' || a.city === 'Alcalá de Henares'
  const bM =
    b.province === 'Madrid' || b.province === 'Alcalá de Henares' || b.city === 'Alcalá de Henares'
  if (aM && bM) return true
  return (a.province || '') === (b.province || '')
}

/**
 * Lee el cuerpo de la respuesta como JSON. Si el servidor devolvió HTML (p. ej. error 500
 * sin manejar), se muestra un mensaje legible en lugar de solo "Internal Server Error".
 */
async function readApiErrorJson(
  res: Response
): Promise<{ success?: boolean; error?: string; errorDetail?: unknown; [k: string]: unknown }> {
  const text = await res.text()
  if (!text) {
    return { success: false, error: res.statusText || 'Respuesta vacía' }
  }
  try {
    return JSON.parse(text) as { success?: boolean; error?: string; errorDetail?: unknown }
  } catch {
    return {
      success: false,
      error:
        /^\s*<!/.test(text) || /<html/i.test(text)
          ? `Error del servidor (HTTP ${res.status}). Revisá la terminal donde corre "npm run dev" para el detalle.`
          : (text.length > 400 ? `${text.slice(0, 400)}…` : text) || res.statusText,
    }
  }
}

const MAX_SIMILAR_ALQUILER = 3
const M2_MAX_SIMILAR_DIFF = 10
const MIN_TOKEN_LEN = 3
const PANEL_W = 388
const PANEL_H_APPROX = 360

/** Palabras demasiado genéricas; no cuentan como “zona común” solas, pero títulos reales aportan otras. */
const ADDRESS_STOPWORDS = new Set([
  'the',
  'y',
  'o',
  'a',
  'de',
  'del',
  'al',
  'el',
  'la',
  'las',
  'los',
  'le',
  'les',
  'un',
  'uns',
  'una',
  'en',
  'con',
  'por',
  'sin',
  'que',
  'calle',
  'plaza',
  'avenida',
  'paseo',
  'n',
  'c',
  'bajo',
  'bajos',
  'izquierda',
  'derecha',
  'euros',
  'euro',
  'vivienda',
  'piso',
  'casas',
  'venta',
  'alquiler',
])

/** Tokens (sin acentos, mín. MIN_TOKEN_LEN) a partir de un fragmento de texto. */
function tokenizeLocationString(raw: string): Set<string> {
  const norm = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const parts = norm.split(/[^a-z0-9ñ]+/i)
  const out = new Set<string>()
  for (const p of parts) {
    if (!p) continue
    if (p.length < MIN_TOKEN_LEN) continue
    if (ADDRESS_STOPWORDS.has(p)) continue
    if (/^m2?$/.test(p)) continue
    if (/^\d+$/.test(p)) continue
    out.add(p)
  }
  return out
}

/**
 * Texto reutilizable para emparejar zona/dirección entre compra y alquiler.
 * Devuelve tokens de dirección, título, barrio, ciudad y provincia.
 */
function tokenizeListingLocation(l: Listing): Set<string> {
  const raw = [l.publishedAddress, l.title, l.neighborhood, l.city, l.province]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join(' ')
  return tokenizeLocationString(raw)
}

/**
 * Tras la última coma (suele ser barrio/microzona en Idealista). Prioridad para el match.
 * Si la dirección no tiene comas, usa el título con la misma regla.
 */
function tokenizeAfterLastCommaFields(l: Listing): Set<string> {
  for (const field of [l.publishedAddress, l.title] as const) {
    if (field == null || !field.trim()) continue
    const idx = field.lastIndexOf(',')
    if (idx === -1 || idx >= field.length - 1) continue
    const toks = tokenizeLocationString(field.slice(idx + 1))
    if (toks.size > 0) return toks
  }
  return new Set()
}

function setsHaveCommonToken(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false
  return Array.from(a).some((w) => b.has(w))
}

/**
 * Si ambas fichas tienen términos tras la última coma, exige match ahí.
 * Si no, cae al cruce de todo el texto (dirección, título, barrio, ciudad, provincia).
 */
function hasCommonLocationToken(compra: Listing, alq: Listing): boolean {
  const lastA = tokenizeAfterLastCommaFields(compra)
  const lastB = tokenizeAfterLastCommaFields(alq)
  if (lastA.size > 0 && lastB.size > 0) {
    return setsHaveCommonToken(lastA, lastB)
  }
  return setsHaveCommonToken(tokenizeListingLocation(compra), tokenizeListingLocation(alq))
}

/**
 * Mismo criterio de m²: si la compra tiene m², el alquiler también y |Δ| ≤ 10 m²;
 * si la compra no tiene m², no exigimos este filtro.
 */
function surfaceCloseEnoughForSimilar(compra: Listing, alq: Listing): boolean {
  const c = compra.surface
  const al = alq.surface
  if (c != null && c > 0) {
    if (al == null || al <= 0) return false
    return Math.abs(c - al) <= M2_MAX_SIMILAR_DIFF
  }
  return true
}


/** Posición fija del panel bajo o encima de la fila o tarjeta (misma lógica). */
function getPanelPosFromRow(el: HTMLElement): { top: number; left: number } {
  const r = el.getBoundingClientRect()
  const wH = window.innerHeight
  const wW = window.innerWidth
  const maxLeft = Math.max(8, wW - 8 - PANEL_W)
  const spaceBelow = wH - r.bottom - 12
  // Solape de unos píxeles bajo la fila para que al ir al panel no haya "aire" entre tr y el panel (el pointer no cruza "ningún" elemento y dispara cierre).
  const top =
    spaceBelow < 160 && r.top > PANEL_H_APPROX
      ? Math.max(8, r.top - PANEL_H_APPROX - 4)
      : r.bottom - 6
  return { top, left: Math.max(8, Math.min(r.left, maxLeft)) }
}

/**
 * Bruta anual del alquiler respecto al precio de compra del piso de la fila (no viene de la BD en la mayoría de anuncios).
 * (alquiler_mes × 12 / precio_compra) × 100
 */
function rentabilidadBrutaSobreCompraRef(alquiler: Listing, compra: Listing): number | null {
  if (alquiler.type !== 'alquiler' || compra.type !== 'compra') return null
  const m = alquiler.price
  const p = compra.price
  if (typeof m !== 'number' || typeof p !== 'number' || !Number.isFinite(m) || !Number.isFinite(p) || m <= 0 || p <= 0) {
    return null
  }
  return (m * 12 / p) * 100
}

/**
 * Misma “zona” lógica, misma hab., m² a ±M2_MAX_SIMILAR_DIFF m² (si la compra tiene m²)
 * y término en común: preferente en el tramo tras la última coma de la dirección/título; si no aplica, todo el texto.
 */
function isSimilarAlquiler(compra: Listing, alq: Listing): boolean {
  if (alq.type !== 'alquiler' || !sameBarrioYProvincia(compra, alq)) return false
  const r0 = compra.rooms
  const r1 = alq.rooms
  if (r0 == null || r1 == null) return false
  if (r0 !== r1) return false
  if (!surfaceCloseEnoughForSimilar(compra, alq)) return false
  if (!hasCommonLocationToken(compra, alq)) return false
  return true
}

function sortAlquileresParaCompra(a: Listing, b: Listing, compra: Listing): number {
  const pa = rentabilidadBrutaSobreCompraRef(a, compra) ?? a.profitabilityRate
  const pb = rentabilidadBrutaSobreCompraRef(b, compra) ?? b.profitabilityRate
  if (pa != null && pb != null && pb !== pa) return pb - pa
  if (pa != null && pb == null) return -1
  if (pa == null && pb != null) return 1
  return a.price - b.price
}

function getSimilarAlquileres(compra: Listing, alquilerPool: Listing[]): Listing[] {
  if (compra.type !== 'compra' || !compra.neighborhood?.trim() || compra.rooms == null) return []
  return alquilerPool
    .filter((a) => isSimilarAlquiler(compra, a))
    .sort((a, b) => sortAlquileresParaCompra(a, b, compra))
    .slice(0, MAX_SIMILAR_ALQUILER)
}

/**
 * Mismo barrio + provincia y mismas hab., sin zona/m². Para mostrar si no hay matches estrictos.
 */
function getFallbackAlquileresEnBarrio(compra: Listing, alquilerPool: Listing[]): Listing[] {
  if (compra.type !== 'compra' || !compra.neighborhood?.trim() || compra.rooms == null) return []
  return alquilerPool
    .filter(
      (a) => a.type === 'alquiler' && sameBarrioYProvincia(compra, a) && a.rooms != null && a.rooms === compra.rooms
    )
    .sort((a, b) => sortAlquileresParaCompra(a, b, compra))
    .slice(0, MAX_SIMILAR_ALQUILER)
}

/** Redondea minutos al bloque de 10 min más cercano (:00, :10, :20, :30, :40, :50). */
function roundToTenMinutes(d: Date): Date {
  const mins = d.getMinutes()
  const rounded = Math.round(mins / 10) * 10
  const out = new Date(d)
  if (rounded >= 60) {
    out.setHours(out.getHours() + 1)
    out.setMinutes(0, 0, 0)
  } else {
    out.setMinutes(rounded, 0, 0)
  }
  return out
}

/** Fecha mínima (hoy) para el input date. */
function minDateToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Minutos desde medianoche para un slot "HH:mm". */
function slotMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

const DAY_START_MIN = 7 * 60
const LAST_SLOT_MIN = 21 * 60 + 50 // 21:50

/**
 * Si la fecha es hoy: minutos del primer slot permitido (múltiplos de 10 desde ahora).
 * Si ya pasó el último slot (21:50), null (no hay opciones).
 * Para otros días: desde 07:00.
 */
function minSlotMinutesForDate(dateStr: string): number | null {
  const today = minDateToday()
  if (!dateStr || dateStr !== today) {
    return DAY_START_MIN
  }
  const d = new Date()
  const nowMin =
    d.getHours() * 60 +
    d.getMinutes() +
    d.getSeconds() / 60 +
    d.getMilliseconds() / 60000
  const nextStart = Math.ceil(nowMin / 10) * 10
  if (nextStart > LAST_SLOT_MIN) return null
  return Math.max(nextStart, DAY_START_MIN)
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = roundToTenMinutes(new Date(iso))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function formatCita(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** Iconos estilo idealista-pro-makeover (lucide-like) para tarjetas móvil */
function CardIconMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function CardIconBed({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 4v16" />
      <path d="M2 8h3.5a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 1.6 0l.8-1.6a1 1 0 0 1 1.8 0l.8 1.6a1 1 0 0 0 1.6 0l.9-1.2a1 1 0 0 1 .8-.4H22" />
      <path d="M2 12h20" />
    </svg>
  )
}

function CardIconMaximize({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function CardIconEye({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CardIconCalendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function CardIconFile({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 2h9l5 5v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M13 2v5h5" />
    </svg>
  )
}

function CardIconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  )
}

/** Icono de visitado (pin de ubicación). */
function VisitadoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  )
}

function AddressCell({
  row,
  onToggleSimilar,
}: {
  row: Listing
  onToggleSimilar?: (row: Listing, anchor: HTMLElement) => void
}) {
  const addr = row.publishedAddress || row.title || '—'
  const canSimilar = row.type === 'compra' && onToggleSimilar

  const openSimilar = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (!canSimilar || !onToggleSimilar) return
    const tr = e.currentTarget.closest('tr')
    if (tr) onToggleSimilar(row, tr)
  }

  return (
    <td className={styles.cellAddress}>
      <div className={styles.addressCellTop}>
        {canSimilar ? (
          <>
            <div
              className={`${styles.cellAddressMain} ${styles.cellAddressClickable}`}
              role="button"
              tabIndex={0}
              title={addr !== '—' ? (row.publishedAddress || row.title || undefined) : undefined}
              onClick={openSimilar}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const tr = (e.currentTarget as HTMLElement).closest('tr')
                  if (tr && onToggleSimilar) onToggleSimilar(row, tr)
                }
              }}
            >
              {addr}
            </div>
            <button
              type="button"
              className={styles.similarOpenBtn}
              onClick={openSimilar}
              aria-label="Ver alquileres similares en la zona"
              title="Alquileres similares"
            >
              <span aria-hidden>➕</span>
            </button>
          </>
        ) : (
          <div
            className={styles.cellAddressMain}
            title={addr !== '—' ? (row.publishedAddress || row.title || undefined) : undefined}
          >
            {addr}
          </div>
        )}
      </div>
      <p className={styles.cellAddressMeta} aria-label="Habitaciones y metros cuadrados">
        {row.rooms != null ? `${row.rooms} hab.` : '— hab.'} · {row.surface != null ? `${row.surface} m²` : '— m²'}
      </p>
    </td>
  )
}

function ContactoListingCard({
  row,
  formatPrice: fmtPrice,
  formatCita: fmtCita,
  onToggleSimilar,
  onOpenPhone,
  onToggleVisitado,
  visitadoTogglingId,
  onOpenEdit,
  onDelete,
}: {
  row: Listing
  formatPrice: (n: number) => string
  formatCita: (iso: string | null) => string
  onToggleSimilar: (row: Listing, anchor: HTMLElement) => void
  onOpenPhone: (row: Listing) => void
  onToggleVisitado: (row: Listing) => void
  visitadoTogglingId: number | null
  onOpenEdit: (row: Listing) => void
  onDelete: (id: number) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const addr = row.publishedAddress || row.title || '—'
  const canSimilar = row.type === 'compra'
  const locLabel = row.province?.trim() || row.city?.trim() || '—'
  const barrio = row.neighborhood?.trim() || ''
  const titleText =
    barrio && !addr.toLowerCase().includes(barrio.toLowerCase()) ? `${addr} · ${barrio}` : addr

  const openSimilar = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (!canSimilar) return
    const article = e.currentTarget.closest('article')
    if (article) onToggleSimilar(row, article)
  }

  return (
    <article
      className={styles.listingCard}
      role="listitem"
    >
      <div className={styles.listingCardTopBar}>
        <div className={styles.listingCardPriceBig} aria-label="Precio de venta o alquiler">
          {fmtPrice(row.price)}
        </div>
        <span className={styles.listingCardPill} data-variant="sale">
          {row.type === 'compra' ? 'En venta' : 'En alquiler'}
        </span>
      </div>
      <p className={styles.listingCardLocLine}>
        <CardIconMapPin className={styles.listingCardLocIcon} />
        {locLabel}
      </p>
      {canSimilar ? (
        <h3
          className={`${styles.listingCardPropertyTitle} ${styles.cellAddressClickable}`}
          title={addr !== '—' ? (row.publishedAddress || row.title || undefined) : undefined}
          role="button"
          tabIndex={0}
          onClick={openSimilar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              const a = (e.currentTarget as HTMLElement).closest('article')
              if (a) onToggleSimilar(row, a)
            }
          }}
        >
          {titleText}
        </h3>
      ) : (
        <h3 className={styles.listingCardPropertyTitle}>{titleText}</h3>
      )}
      <div className={styles.listingCardChips} aria-label="Habitaciones y superficie">
        <span className={styles.listingCardChip}>
          <CardIconBed className={styles.listingCardChipIcon} />
          {row.rooms != null ? `${row.rooms} hab.` : '— hab.'}
        </span>
        <span className={styles.listingCardChip}>
          <CardIconMaximize className={styles.listingCardChipIcon} />
          {row.surface != null ? `${row.surface} m²` : '— m²'}
        </span>
      </div>
      <div className={styles.listingCardCtaRow}>
        <a
          href={row.link}
          className={styles.listingCardVerCta}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.listingCardVerCtaInner}>
            <CardIconEye className={styles.listingCardVerCtaIcon} />
            <span>Ver</span>
          </span>
        </a>
        {canSimilar && (
          <button
            type="button"
            className={styles.listingCardPlusCta}
            onClick={openSimilar}
            aria-label="Ver alquileres similares en la zona"
            title="Alquileres similares"
          >
            +
          </button>
        )}
      </div>
      <div className={styles.listingCardMetaSection}>
        <button
          type="button"
          className={styles.listingCardAccordionHead}
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          aria-controls={`card-panel-${row.id}`}
          id={`card-head-${row.id}`}
        >
          <div className={styles.listingCardAccordionHeadLeft}>
            <span className={styles.listingCardMetaPillLabel}>
              <CardIconCalendar className={styles.listingCardMetaPillIcon} />
              Cita
            </span>
            <span className={styles.listingCardMetaPillLabel}>
              <CardIconFile className={styles.listingCardMetaPillIcon} />
              Notas
              {row.notas && row.notas.trim() !== '' && <span className={styles.listingCardNotasDot} aria-hidden />}
            </span>
          </div>
          <CardIconChevronDown
            className={detailsOpen ? `${styles.listingCardChevron} ${styles.listingCardChevronOpen}` : styles.listingCardChevron}
          />
        </button>
        {detailsOpen && (
          <div
            className={styles.listingCardAccordionBody}
            id={`card-panel-${row.id}`}
            role="region"
            aria-labelledby={`card-head-${row.id}`}
          >
            <div>
              <div className={styles.listingCardFieldLabel}>Cita</div>
              <div className={styles.listingCardFieldValue}>{fmtCita(row.citaAt)}</div>
            </div>
            <div>
              <div className={styles.listingCardFieldLabel}>Notas</div>
              <div className={styles.listingCardNotasText}>{row.notas || '—'}</div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.listingCardBottomBar}>
        <div className={styles.listingCardBottomBarLeft}>
          <button
            type="button"
            className={`${(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled} ${
              styles.listingCardRoundIcon
            }`}
            onClick={() => onOpenPhone(row)}
            title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
            aria-label="Abrir diálogo teléfono y llamada"
          >
            <PhoneIcon />
          </button>
          <button
            type="button"
            className={`${(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado} ${
              styles.listingCardRoundIcon
            }`}
            onClick={() => onToggleVisitado(row)}
            disabled={visitadoTogglingId === row.id}
            title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
            aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
          >
            <VisitadoIcon />
          </button>
        </div>
        <div className={styles.listingCardBottomBarRight}>
          <button
            type="button"
            className={`${styles.btnEdit} ${styles.listingCardFabEdit}`}
            onClick={() => onOpenEdit(row)}
            aria-label="Editar"
            title="Editar"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className={`${styles.btnDanger} ${styles.listingCardFabTrash}`}
            onClick={() => onDelete(row.id)}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </article>
  )
}

type AddListingForm = {
  type: 'compra' | 'alquiler'
  price: string
  surface: string
  link: string
  neighborhood: string
  province: string
  publishedAddress: string
  rooms: string
  citaAt: string
  contacto: '' | 'Juli' | 'Kalu'
  phone: string
  notas: string
  llamado: boolean
  visitado: boolean
}

function getDefaultAddForm(): AddListingForm {
  return {
    type: 'compra',
    price: '',
    surface: '',
    link: 'https://www.idealista.com/',
    neighborhood: '',
    province: 'Madrid',
    publishedAddress: '',
    rooms: '',
    citaAt: '',
    contacto: '',
    phone: '',
    notas: '',
    llamado: false,
    visitado: false,
  }
}

type EditListingForm = {
  type: 'compra' | 'alquiler'
  title: string
  price: string
  surface: string
  link: string
  profitabilityRate: string
  neighborhood: string
  city: string
  province: string
  publishedAddress: string
  rooms: string
  citaAt: string
  notas: string
  contacto: '' | 'Juli' | 'Kalu'
  phone: string
  llamado: boolean
  visitado: boolean
}

function getEmptyEditForm(): EditListingForm {
  return {
    type: 'compra',
    title: '',
    price: '',
    surface: '',
    link: '',
    profitabilityRate: '',
    neighborhood: '',
    city: '',
    province: '',
    publishedAddress: '',
    rooms: '',
    citaAt: '',
    notas: '',
    contacto: '',
    phone: '',
    llamado: false,
    visitado: false,
  }
}

function listingToEditForm(row: Listing): EditListingForm {
  return {
    type: row.type === 'alquiler' ? 'alquiler' : 'compra',
    title: row.title ?? '',
    price: String(row.price ?? ''),
    surface: row.surface != null && !Number.isNaN(Number(row.surface)) ? String(row.surface) : '',
    link: row.link ?? '',
    profitabilityRate:
      row.profitabilityRate != null && !Number.isNaN(Number(row.profitabilityRate))
        ? String(row.profitabilityRate)
        : '',
    neighborhood: row.neighborhood ?? '',
    city: row.city ?? '',
    province: row.province ?? '',
    publishedAddress: row.publishedAddress ?? '',
    rooms: row.rooms != null ? String(row.rooms) : '',
    citaAt: row.citaAt ? toDatetimeLocal(row.citaAt) : '',
    notas: row.notas ?? '',
    contacto: row.contacto === 'Juli' || row.contacto === 'Kalu' ? row.contacto : '',
    phone: row.phone ?? '',
    llamado: row.llamado ?? false,
    visitado: row.visitado ?? false,
  }
}

type SortKey = 'publishedAddress' | 'neighborhood' | 'price' | 'citaAt' | 'notas'
type SortDir = 'asc' | 'desc'

function compareListings(
  a: Listing,
  b: Listing,
  sortBy: SortKey,
  sortDir: SortDir
): number {
  const va: string | number | null =
    sortBy === 'publishedAddress'
      ? a.publishedAddress || a.title || ''
      : sortBy === 'neighborhood'
        ? a.neighborhood || ''
        : sortBy === 'price'
          ? a.price
          : sortBy === 'citaAt'
            ? a.citaAt || ''
            : a.notas || ''
  const vb: string | number | null =
    sortBy === 'publishedAddress'
      ? b.publishedAddress || b.title || ''
      : sortBy === 'neighborhood'
        ? b.neighborhood || ''
        : sortBy === 'price'
          ? b.price
          : sortBy === 'citaAt'
            ? b.citaAt || ''
            : b.notas || ''
  if (sortBy === 'price') {
    const diff = (va as number) - (vb as number)
    return sortDir === 'asc' ? diff : -diff
  }
  if (sortBy === 'citaAt') {
    const da = va ? new Date(va as string).getTime() : 0
    const db = vb ? new Date(vb as string).getTime() : 0
    const diff = da - db
    return sortDir === 'asc' ? diff : -diff
  }
  const sa = String(va).localeCompare(String(vb), 'es')
  return sortDir === 'asc' ? sa : -sa
}

function SortChevronsIcon() {
  return (
    <svg
      className={styles.thSortIconSvg}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 9l4-4 4 4" />
      <path d="M8 15l4 4 4-4" />
    </svg>
  )
}

function SortDirIcon({ dir }: { dir: 'asc' | 'desc' }) {
  return (
    <svg
      className={styles.thSortIconSvg}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === 'asc' ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

function SortableTh({
  label,
  sortKey: columnKey,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sortBy: SortKey | null
  sortDir: SortDir
  onSort: (k: SortKey) => void
}) {
  const active = sortBy === columnKey
  return (
    <th
      scope="col"
      className={styles.thSortable}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={styles.thSortButton}
        onClick={() => onSort(columnKey)}
        title={`Ordenar por ${label}`}
      >
        <span className={styles.thSortButtonLabel}>{label}</span>
        <span
          className={
            active
              ? `${styles.thSortIconSlot} ${styles.thSortIconActive}`
              : styles.thSortIconSlot
          }
        >
          {active ? <SortDirIcon dir={sortDir} /> : <SortChevronsIcon />}
        </span>
      </button>
    </th>
  )
}

export default function ContactosPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBarrio, setSelectedBarrio] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditListingForm>(() => getEmptyEditForm())
  const [phoneDialogId, setPhoneDialogId] = useState<number | null>(null)
  const [phoneDialogForm, setPhoneDialogForm] = useState<{ phone: string; llamado: boolean }>({ phone: '', llamado: false })
  const [savingPhone, setSavingPhone] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddListingForm>(() => getDefaultAddForm())
  const [savingAdd, setSavingAdd] = useState(false)
  const [visitadoTogglingId, setVisitadoTogglingId] = useState<number | null>(null)
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<string>('200000') // Por defecto ocultar pisos > 200.000 €
  const [alquilerPool, setAlquilerPool] = useState<Listing[]>([])
  const [similarHover, setSimilarHover] = useState<{
    row: Listing
    top: number
    left: number
  } | null>(null)
  const similarRowRef = useRef<HTMLElement | null>(null)
  const similarPanelRef = useRef<HTMLDivElement | null>(null)

  const closeSimilarPanel = useCallback(() => {
    similarRowRef.current = null
    similarPanelRef.current = null
    setSimilarHover(null)
  }, [])

  const toggleSimilarPanel = useCallback((row: Listing, anchor: HTMLElement) => {
    if (row.type !== 'compra') return
    setSimilarHover((prev) => {
      if (prev?.row.id === row.id) {
        similarRowRef.current = null
        return null
      }
      similarRowRef.current = anchor
      const { top, left } = getPanelPosFromRow(anchor)
      return { row, top, left }
    })
  }, [])

  const loadListings = () => {
    setLoading(true)
    const params = new URLSearchParams({ type: 'compra' })
    if (selectedMaxPrice !== 'all') {
      params.append('maxPrice', selectedMaxPrice)
    }
    fetch(`/api/listings?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setListings(json.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaxPrice])

  useEffect(() => {
    let cancelled = false
    fetch('/api/listings?type=alquiler')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setAlquilerPool(json.data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const similarRowId = similarHover?.row.id

  useEffect(() => {
    if (similarRowId == null) return
    const sync = () => {
      const el = similarRowRef.current
      if (!el) return
      if (!el.isConnected) return
      const { top, left } = getPanelPosFromRow(el)
      setSimilarHover((h) => (h ? { ...h, top, left } : h))
    }
    const raf = requestAnimationFrame(() => sync())
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
    }
  }, [similarRowId])

  useEffect(() => {
    if (similarRowId == null) return
    const onDown = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (similarRowRef.current?.contains(t) || similarPanelRef.current?.contains(t)) return
      closeSimilarPanel()
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [similarRowId, closeSimilarPanel])

  useEffect(() => {
    if (similarRowId == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSimilarPanel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [similarRowId, closeSimilarPanel])

  const openEdit = (row: Listing) => {
    setEditingId(row.id)
    setEditForm(listingToEditForm(row))
  }

  const closeEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este piso de la lista?')) return
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      const json = await readApiErrorJson(res)
      if (json.success) {
        if (editingId === id) closeEdit()
        loadListings()
      } else {
        alert(json.error || 'Error al eliminar')
      }
    } catch {
      alert('Error al eliminar')
    }
  }

  const openPhoneDialog = (row: Listing) => {
    setPhoneDialogId(row.id)
    setPhoneDialogForm({
      phone: row.phone ?? '',
      llamado: row.llamado ?? false,
    })
  }

  const closePhoneDialog = () => {
    setPhoneDialogId(null)
  }

  const handleToggleVisitado = async (row: Listing) => {
    const next = !(row.visitado ?? false)
    setVisitadoTogglingId(row.id)
    try {
      const res = await fetch(`/api/listings/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitado: next }),
      })
      const json = await readApiErrorJson(res)
      if (json.success) loadListings()
      else alert(json.error || 'Error al guardar')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setVisitadoTogglingId(null)
    }
  }

  const savePhoneDialog = async () => {
    if (phoneDialogId == null) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/listings/${phoneDialogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: (phoneDialogForm.phone?.trim() ?? '') || null,
          llamado: phoneDialogForm.llamado,
        }),
      })
      const json = await readApiErrorJson(res)
      if (json.success) {
        closePhoneDialog()
        loadListings()
      } else {
        console.error('[savePhoneDialog] Respuesta de error:', json)
        if (json.errorDetail) console.error('[savePhoneDialog] Detalle:', json.errorDetail)
        alert((json.error || 'Error al guardar') + '\n\n(Abrí la consola (F12 > Console) o Network > PUT > Response para ver el error completo.)')
      }
    } catch (e) {
      console.error('[savePhoneDialog] Excepción:', e)
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingPhone(false)
    }
  }

  const saveEdit = async () => {
    if (editingId == null) return
    const priceRaw = editForm.price.replace(/,/g, '.').replace(/\s/g, '')
    const priceNum = parseFloat(priceRaw)
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      alert('Indicá un precio válido (mayor que 0).')
      return
    }
    const prevType = listings.find((l) => l.id === editingId)?.type
    setSaving(true)
    try {
      let citaAt: string | null = null
      if (editForm.citaAt && editForm.citaAt.length >= 16) {
        const d = new Date(editForm.citaAt)
        if (!Number.isNaN(d.getTime())) {
          citaAt = roundToTenMinutes(d).toISOString()
        }
      }
      const roomsTrim = editForm.rooms.trim()
      const roomsNum = roomsTrim ? parseInt(roomsTrim, 10) : NaN
      const surfTrim = editForm.surface.trim()
      const surfNum = surfTrim ? parseFloat(surfTrim.replace(',', '.')) : NaN
      const prTrim = editForm.profitabilityRate.trim()
      const prNum = prTrim ? parseFloat(prTrim.replace(',', '.')) : NaN
      const linkFinal = editForm.link.trim() || 'https://www.idealista.com/'
      const payload = {
        type: editForm.type,
        title: editForm.title.trim() || null,
        price: priceNum,
        link: linkFinal,
        surface: surfTrim && !Number.isNaN(surfNum) ? surfNum : null,
        profitabilityRate: prTrim && !Number.isNaN(prNum) ? prNum : null,
        neighborhood: editForm.neighborhood.trim() || null,
        city: editForm.city.trim() || null,
        province: editForm.province.trim() || null,
        publishedAddress: editForm.publishedAddress.trim() || null,
        rooms: roomsTrim && !Number.isNaN(roomsNum) ? roomsNum : null,
        citaAt,
        notas: (editForm.notas?.trim() ?? '') || null,
        contacto: editForm.contacto || null,
        phone: (editForm.phone?.trim() ?? '') || null,
        llamado: editForm.llamado,
        visitado: editForm.visitado,
      }
      const res = await fetch(`/api/listings/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await readApiErrorJson(res)
      if (json.success) {
        closeEdit()
        loadListings()
        if (prevType === 'alquiler' || editForm.type === 'alquiler') {
          fetch('/api/listings?type=alquiler')
            .then((r) => r.json())
            .then((j) => {
              if (j.success && Array.isArray(j.data)) setAlquilerPool(j.data)
            })
            .catch(() => {})
        }
      } else {
        const err = json.error || 'Error al guardar'
        console.error('PUT /api/listings error:', res.status, err)
        alert(err)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar'
      console.error('saveEdit exception:', e)
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  const openAddListing = () => {
    setAddForm(getDefaultAddForm())
    setAddOpen(true)
  }

  const closeAddListing = () => {
    setAddOpen(false)
  }

  const saveAddListing = async () => {
    const priceRaw = addForm.price.replace(/,/g, '.').replace(/\s/g, '')
    const priceNum = parseFloat(priceRaw)
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      alert('Indicá un precio válido (mayor que 0).')
      return
    }
    let citaAt: string | null = null
    if (addForm.citaAt && addForm.citaAt.length >= 16) {
      const d = new Date(addForm.citaAt)
      if (!Number.isNaN(d.getTime())) {
        citaAt = roundToTenMinutes(d).toISOString()
      }
    }
    const roomsTrim = addForm.rooms.trim()
    const roomsNum = roomsTrim ? parseInt(roomsTrim, 10) : NaN
    const surfTrim = addForm.surface.trim()
    const surfNum = surfTrim ? parseFloat(surfTrim.replace(',', '.')) : NaN
    setSavingAdd(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addForm.type,
          price: priceNum,
          link: addForm.link.trim() || 'https://www.idealista.com/',
          neighborhood: addForm.neighborhood.trim() || null,
          province: addForm.province.trim() || 'Madrid',
          publishedAddress: addForm.publishedAddress.trim() || null,
          rooms: roomsTrim && !Number.isNaN(roomsNum) ? roomsNum : null,
          surface: surfTrim && !Number.isNaN(surfNum) ? surfNum : null,
          citaAt,
          contacto: addForm.contacto || null,
          phone: addForm.phone.trim() || null,
          notas: addForm.notas.trim() || null,
          llamado: addForm.llamado,
          visitado: addForm.visitado,
        }),
      })
      const json = await readApiErrorJson(res)
      if (json.success) {
        closeAddListing()
        loadListings()
        if (addForm.type === 'alquiler') {
          fetch('/api/listings?type=alquiler')
            .then((r) => r.json())
            .then((j) => {
              if (j.success && Array.isArray(j.data)) setAlquilerPool(j.data)
            })
            .catch(() => {})
        }
      } else {
        alert((json as { error?: string }).error || 'No se pudo crear el piso')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingAdd(false)
    }
  }

  // Incluir Madrid y ciudades de la Comunidad de Madrid (Alcalá de Henares, etc.)
  const isMadridArea = (l: Listing) =>
    l.province === 'Madrid' || l.province === 'Alcalá de Henares' || l.city === 'Alcalá de Henares'
  const filteredByProvince = listings.filter(isMadridArea)
  const nowForFilter = Date.now()
  const filteredForTodos = filteredByProvince.filter(
    (l) =>
      !(l.visitado === true) &&
      (!l.citaAt || new Date(l.citaAt).getTime() <= nowForFilter)
  )

  const barrios = Array.from(
    new Set(
      filteredForTodos
        .map((l) => l.neighborhood?.trim())
        .filter((b): b is string => Boolean(b))
    )
  ).sort((a, b) => a.localeCompare(b, 'es'))

  const filteredByBarrio =
    selectedBarrio === null
      ? filteredForTodos
      : filteredForTodos.filter((l) => l.neighborhood === selectedBarrio)

  const searchLower = searchQuery.trim().toLowerCase()
  const searchNum = searchLower ? parseFloat(searchQuery.replace(/[^\d,.]/g, '').replace(',', '.')) : NaN
  const filteredBySearch = searchLower
    ? filteredByBarrio.filter((l) => {
        const addr = (l.publishedAddress || l.title || '').toLowerCase()
        const barrio = (l.neighborhood || '').toLowerCase()
        if (!Number.isNaN(searchNum)) {
          return l.price === searchNum || String(l.price).includes(searchQuery.trim()) || addr.includes(searchLower) || barrio.includes(searchLower)
        }
        return addr.includes(searchLower) || barrio.includes(searchLower)
      })
    : filteredByBarrio

  const sortedListings = sortBy
    ? [...filteredBySearch].sort((a, b) => compareListings(a, b, sortBy, sortDir))
    : filteredBySearch

  const visitedListings = listings.filter((l) => l.visitado === true)
  const now = Date.now()
  const upcomingCitasListings = listings.filter(
    (l) => l.citaAt != null && new Date(l.citaAt).getTime() > now
  )
  const sortedUpcomingCitasListings = sortBy
    ? [...upcomingCitasListings].sort((a, b) => compareListings(a, b, sortBy, sortDir))
    : [...upcomingCitasListings].sort(
        (a, b) =>
          new Date(a.citaAt!).getTime() - new Date(b.citaAt!).getTime()
      )
  const sortedVisitedListings = sortBy
    ? [...visitedListings].sort((a, b) => compareListings(a, b, sortBy, sortDir))
    : visitedListings

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)

  const formatRentabilidad = (p: number | null | undefined) =>
    p != null && !Number.isNaN(Number(p)) ? `${Number(p).toFixed(1)}%` : '—'

  const editingRow = editingId != null ? listings.find((l) => l.id === editingId) : null
  const editingPhoneRow = phoneDialogId != null ? listings.find((l) => l.id === phoneDialogId) : null
  const similaresEstrictos = similarHover
    ? getSimilarAlquileres(similarHover.row, alquilerPool)
    : []
  const similaresFallback =
    similarHover && similaresEstrictos.length === 0 && similarHover.row.rooms != null
      ? getFallbackAlquileresEnBarrio(similarHover.row, alquilerPool)
      : []

  const renderSimilarListItem = (a: Listing, refCompra: Listing) => (
    <li key={a.id} className={styles.similarDialogItem}>
      <div className={styles.similarDialogItemLine}>
        <span>
          {(a.publishedAddress || a.title || 'Sin dirección').length > 72
            ? `${(a.publishedAddress || a.title || '').slice(0, 72)}…`
            : a.publishedAddress || a.title || '—'}
        </span>
      </div>
      <p className={styles.similarDialogItemMeta} aria-label="Habitaciones y metros cuadrados">
        {a.rooms != null ? `${a.rooms} hab.` : '— hab.'} · {a.surface != null ? `${a.surface} m²` : '— m²'}
      </p>
      <div className={styles.similarDialogItemLine}>
        <span className={styles.similarDialogRent}>Alquiler: {formatPrice(a.price)}/mes</span>
        <span
          className={styles.similarDialogProfit}
          title="Bruta anual: (alquiler mensual × 12) / precio de compra del piso de esta fila"
        >
          Rentabilidad: {formatRentabilidad(rentabilidadBrutaSobreCompraRef(a, refCompra) ?? a.profitabilityRate)}
        </span>
      </div>
      <IdealistaLinkIcon
        href={a.link}
        className={styles.similarDialogLink}
        imgClassName={styles.similarDialogLinkImg}
      />
    </li>
  )

  const renderListingCard = (row: Listing) => (
    <ContactoListingCard
      key={row.id}
      row={row}
      formatPrice={formatPrice}
      formatCita={formatCita}
      onToggleSimilar={toggleSimilarPanel}
      onOpenPhone={openPhoneDialog}
      onToggleVisitado={handleToggleVisitado}
      visitadoTogglingId={visitadoTogglingId}
      onOpenEdit={openEdit}
      onDelete={handleDelete}
    />
  )

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.heroKicker} aria-hidden>
            <span className={styles.heroKickerDot} />
            Visitas e inventario
          </p>
          <div className={styles.headerTop}>
            <div className={styles.headerTopMain}>
              <h1 className={styles.title}>Pisos en venta – Contactos</h1>
            </div>
            <button
              type="button"
              className={styles.btnAddListing}
              onClick={openAddListing}
            >
              Añadir piso
            </button>
          </div>
        </header>

        {loading && (
          <section className={styles.section}>
            <p className={styles.loading}>Cargando pisos en venta…</p>
          </section>
        )}

        {!loading && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Próximas Visitas {upcomingCitasListings.length > 0 && `(${upcomingCitasListings.length})`}
              </h2>
              {upcomingCitasListings.length > 0 ? (
                <>
                  <div className={styles.tableOnly}>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <SortableTh
                              label="Nombre"
                              sortKey="publishedAddress"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Barrio"
                              sortKey="neighborhood"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <th className={styles.thLinkIdealista} scope="col">
                              Idealista
                            </th>
                            <SortableTh
                              label="Precio"
                              sortKey="price"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Cita"
                              sortKey="citaAt"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Notas"
                              sortKey="notas"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <th className={styles.thLlamado} scope="col">
                              Llamé
                            </th>
                            <th className={styles.thVisitado} scope="col">
                              Visitado
                            </th>
                            <th className={styles.thActions} scope="col">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedUpcomingCitasListings.map((row) => (
                            <tr key={row.id}>
                              <AddressCell row={row} onToggleSimilar={toggleSimilarPanel} />
                              <td>{row.neighborhood || '—'}</td>
                              <td className={styles.cellLinkIdealista}>
                                <IdealistaLinkIcon
                                  href={row.link}
                                  className={styles.linkIdealista}
                                  imgClassName={styles.linkIdealistaImg}
                                />
                              </td>
                              <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                              <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                              <td className={styles.cellNotas}>
                                {row.notas ? (
                                  <span className={styles.cellNotasText} title={row.notas}>
                                    {row.notas}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className={styles.cellLlamado}>
                                <button
                                  type="button"
                                  className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                                  onClick={() => openPhoneDialog(row)}
                                  title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                                  aria-label="Abrir diálogo teléfono y llamada"
                                >
                                  <PhoneIcon />
                                </button>
                              </td>
                              <td className={styles.cellVisitado}>
                                <button
                                  type="button"
                                  className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                                  onClick={() => handleToggleVisitado(row)}
                                  disabled={visitadoTogglingId === row.id}
                                  title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                                  aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                                >
                                  <VisitadoIcon />
                                </button>
                              </td>
                              <td className={styles.cellActions}>
                                <span className={styles.cellActionsButtons}>
                                  <button
                                    type="button"
                                    className={styles.btnEdit}
                                    onClick={() => openEdit(row)}
                                    aria-label="Editar"
                                    title="Editar"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnDanger}
                                    onClick={() => handleDelete(row.id)}
                                    aria-label="Eliminar"
                                    title="Eliminar"
                                  >
                                    <TrashIcon />
                                  </button>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className={styles.cardsOnly} role="list" aria-label="Próximas visitas (vista móvil)">
                    {sortedUpcomingCitasListings.map((row) => renderListingCard(row))}
                  </div>
                </>
              ) : (
                <p className={styles.noData}>No hay citas futuras con el filtro actual.</p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Visitas Hechas ({visitedListings.length})</h2>
              {visitedListings.length > 0 ? (
                <>
                  <div className={styles.tableOnly}>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <SortableTh
                              label="Nombre"
                              sortKey="publishedAddress"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Barrio"
                              sortKey="neighborhood"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <th className={styles.thLinkIdealista} scope="col">
                              Idealista
                            </th>
                            <SortableTh
                              label="Precio"
                              sortKey="price"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Cita"
                              sortKey="citaAt"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <SortableTh
                              label="Notas"
                              sortKey="notas"
                              sortBy={sortBy}
                              sortDir={sortDir}
                              onSort={handleSort}
                            />
                            <th className={styles.thLlamado} scope="col">
                              Llamé
                            </th>
                            <th className={styles.thVisitado} scope="col">
                              Visitado
                            </th>
                            <th className={styles.thActions} scope="col">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedVisitedListings.map((row) => (
                            <tr key={row.id}>
                              <AddressCell row={row} onToggleSimilar={toggleSimilarPanel} />
                              <td>{row.neighborhood || '—'}</td>
                              <td className={styles.cellLinkIdealista}>
                                <IdealistaLinkIcon
                                  href={row.link}
                                  className={styles.linkIdealista}
                                  imgClassName={styles.linkIdealistaImg}
                                />
                              </td>
                              <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                              <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                              <td className={styles.cellNotas}>
                                {row.notas ? (
                                  <span className={styles.cellNotasText} title={row.notas}>
                                    {row.notas}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className={styles.cellLlamado}>
                                <button
                                  type="button"
                                  className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                                  onClick={() => openPhoneDialog(row)}
                                  title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                                  aria-label="Abrir diálogo teléfono y llamada"
                                >
                                  <PhoneIcon />
                                </button>
                              </td>
                              <td className={styles.cellVisitado}>
                                <button
                                  type="button"
                                  className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                                  onClick={() => handleToggleVisitado(row)}
                                  disabled={visitadoTogglingId === row.id}
                                  title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                                  aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                                >
                                  <VisitadoIcon />
                                </button>
                              </td>
                              <td className={styles.cellActions}>
                                <span className={styles.cellActionsButtons}>
                                  <button
                                    type="button"
                                    className={styles.btnEdit}
                                    onClick={() => openEdit(row)}
                                    aria-label="Editar"
                                    title="Editar"
                                  >
                                    <EditIcon />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnDanger}
                                    onClick={() => handleDelete(row.id)}
                                    aria-label="Eliminar"
                                    title="Eliminar"
                                  >
                                    <TrashIcon />
                                  </button>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className={styles.cardsOnly} role="list" aria-label="Visitas hechas (vista móvil)">
                    {sortedVisitedListings.map((row) => renderListingCard(row))}
                  </div>
                </>
              ) : (
                <p className={styles.noData}>No hay visitas hechas con el filtro actual.</p>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Barrios</h2>
              {barrios.length === 0 ? (
                <p className={styles.noData}>
                  No hay pisos de compra en la base de datos para esta provincia. Cambia de provincia o añade pisos desde el gestor principal.
                </p>
              ) : (
                <div className={styles.barrioIndex}>
                  <button
                    type="button"
                    className={`${styles.barrioChip} ${selectedBarrio === null ? styles.barrioChipActive : ''}`}
                    onClick={() => setSelectedBarrio(null)}
                  >
                    Todos ({filteredForTodos.length})
                  </button>
                  {barrios.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`${styles.barrioChip} ${selectedBarrio === b ? styles.barrioChipActive : ''}`}
                      onClick={() => setSelectedBarrio(b)}
                    >
                      {b} ({filteredForTodos.filter((l) => l.neighborhood === b).length})
                    </button>
                  ))}
                </div>
              )}
            </section>

            {listings.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {selectedBarrio ? `Pisos en venta – ${selectedBarrio}` : 'Todos los pisos en venta'}
                </h2>
                <div className={styles.filterToolbar}>
                <div className={styles.searchRow}>
                  <div className={styles.searchGroup}>
                    <label className={styles.filterLabel} htmlFor="contactos-search">
                      Buscar
                    </label>
                    <input
                      id="contactos-search"
                      type="text"
                      className={styles.searchInput}
                      placeholder="Por dirección o precio…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className={styles.priceFilterGroup}>
                    <label className={styles.filterLabel} htmlFor="contactos-max-price">
                      Precio máximo
                    </label>
                    <select
                      id="contactos-max-price"
                      className={styles.select}
                      value={selectedMaxPrice}
                      onChange={(e) => setSelectedMaxPrice(e.target.value)}
                    >
                      <option value="all">Todos los precios</option>
                      <option value="100000">Menores de 100.000€</option>
                      <option value="150000">Menores de 150.000€</option>
                      <option value="180000">Menores de 180.000€</option>
                      <option value="200000">Menores de 200.000€</option>
                      <option value="250000">Menores de 250.000€</option>
                      <option value="300000">Menores de 300.000€</option>
                      <option value="400000">Menores de 400.000€</option>
                      <option value="500000">Menores de 500.000€</option>
                    </select>
                  </div>
                  <div
                    className={styles.mobileSortBlock}
                    role="group"
                    aria-label="Ordenar listado en móvil"
                  >
                    <label className={styles.filterLabel} htmlFor="contactos-sort-key-m">
                      Ordenar por
                    </label>
                    <div className={styles.mobileSortControls}>
                      <select
                        id="contactos-sort-key-m"
                        className={styles.select}
                        value={sortBy ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === '') {
                            setSortBy(null)
                            return
                          }
                          setSortBy(v as SortKey)
                          setSortDir('asc')
                        }}
                      >
                        <option value="">Predeterminado (orden de carga)</option>
                        <option value="publishedAddress">Nombre</option>
                        <option value="neighborhood">Barrio</option>
                        <option value="price">Precio</option>
                        <option value="citaAt">Cita</option>
                        <option value="notas">Notas</option>
                      </select>
                      <button
                        type="button"
                        className={styles.sortDirButton}
                        disabled={sortBy == null}
                        onClick={() => sortBy != null && handleSort(sortBy)}
                        title={sortBy ? 'Invertir ascendente / descendente' : 'Elegí un criterio de orden primero'}
                        aria-label="Invertir orden ascendente o descendente"
                      >
                        {sortBy == null ? (
                          <span className={styles.sortDirButtonPlaceholder} aria-hidden>
                            —
                          </span>
                        ) : (
                          <span className={styles.sortDirButtonIcon}>
                            <SortDirIcon dir={sortDir} />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                <div className={styles.tableOnly}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <SortableTh
                            label="Nombre"
                            sortKey="publishedAddress"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <SortableTh
                            label="Barrio"
                            sortKey="neighborhood"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <th className={styles.thLinkIdealista} scope="col">
                            Idealista
                          </th>
                          <SortableTh
                            label="Precio"
                            sortKey="price"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <SortableTh
                            label="Cita"
                            sortKey="citaAt"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <SortableTh
                            label="Notas"
                            sortKey="notas"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                          />
                          <th className={styles.thLlamado} scope="col">
                            Llamé
                          </th>
                          <th className={styles.thVisitado} scope="col">
                            Visitado
                          </th>
                          <th className={styles.thActions} scope="col">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedListings.map((row) => (
                          <tr key={row.id}>
                            <AddressCell row={row} onToggleSimilar={toggleSimilarPanel} />
                            <td>{row.neighborhood || '—'}</td>
                            <td className={styles.cellLinkIdealista}>
                              <IdealistaLinkIcon
                                href={row.link}
                                className={styles.linkIdealista}
                                imgClassName={styles.linkIdealistaImg}
                              />
                            </td>
                            <td className={styles.cellPrice}>{formatPrice(row.price)}</td>
                            <td className={styles.cellEditable}>{formatCita(row.citaAt)}</td>
                            <td className={styles.cellNotas}>
                              {row.notas ? (
                                <span className={styles.cellNotasText} title={row.notas}>
                                  {row.notas}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className={styles.cellLlamado}>
                              <button
                                type="button"
                                className={(row.llamado ?? false) ? styles.phoneIconCalled : styles.phoneIconNotCalled}
                                onClick={() => openPhoneDialog(row)}
                                title={(row.llamado ?? false) ? 'Ya llamé' : 'Teléfono / ¿Llamé?'}
                                aria-label="Abrir diálogo teléfono y llamada"
                              >
                                <PhoneIcon />
                              </button>
                            </td>
                            <td className={styles.cellVisitado}>
                              <button
                                type="button"
                                className={(row.visitado ?? false) ? styles.visitadoIconVisitado : styles.visitadoIconNotVisitado}
                                onClick={() => handleToggleVisitado(row)}
                                disabled={visitadoTogglingId === row.id}
                                title={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                                aria-label={(row.visitado ?? false) ? 'Ya visité' : 'Marcar como visitado'}
                              >
                                <VisitadoIcon />
                              </button>
                            </td>
                            <td className={styles.cellActions}>
                              <span className={styles.cellActionsButtons}>
                                <button
                                  type="button"
                                  className={styles.btnEdit}
                                  onClick={() => openEdit(row)}
                                  aria-label="Editar"
                                  title="Editar"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  type="button"
                                  className={styles.btnDanger}
                                  onClick={() => handleDelete(row.id)}
                                  aria-label="Eliminar"
                                  title="Eliminar"
                                >
                                  <TrashIcon />
                                </button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={styles.cardsOnly} role="list" aria-label="Pisos en venta (vista móvil)">
                  {sortedListings.map((row) => renderListingCard(row))}
                </div>
              </section>
            )}
          </>
        )}

      </div>

      {similarHover &&
        typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <div
            ref={similarPanelRef}
            className={styles.similarDialog}
            style={{ top: similarHover.top, left: similarHover.left }}
            role="dialog"
            aria-label="Pisos parecidos en alquiler"
          >
            <div className={styles.similarDialogHeader}>
              <h2 className={styles.similarDialogTitle}>Pisos parecidos en alquiler</h2>
              <button
                type="button"
                className={styles.similarDialogClose}
                onClick={closeSimilarPanel}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {similarHover.row.rooms == null ? (
              <p className={styles.similarDialogEmpty}>
                Este piso de compra no tiene habitaciones en la ficha. Indicá el número de habitaciones en el
                gestor para buscar alquileres comparables en el mismo barrio.
              </p>
            ) : similaresEstrictos.length > 0 ? (
              <ul className={styles.similarDialogList}>
                {similaresEstrictos.map((a) => renderSimilarListItem(a, similarHover.row))}
              </ul>
            ) : (
              <>
                <p className={styles.similarDialogEmpty}>
                  {`No hay alquileres con ${similarHover.row.rooms} hab. en el barrio con zona coincidente.${
                    similaresFallback.length === 0
                      ? ' No hay otros con el mismo barrio y esas habitaciones en la base. Revisá el gestor o los datos en Idealista.'
                      : ''
                  }`}
                </p>
                {similaresFallback.length > 0 ? (
                  <>
                    <p className={styles.similarDialogFallbackSub}>
                      Mismo barrio y habitaciones, sin criterio de zona ni m² (hasta 3):
                    </p>
                    <ul className={styles.similarDialogList}>
                      {similaresFallback.map((a) => renderSimilarListItem(a, similarHover.row))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </div>,
          document.body
        )}

      {/* Modal editar */}
      {editingRow && (
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div
            className={`${styles.modalContent} ${styles.modalContentWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Editar: {editingRow.publishedAddress || editingRow.title || 'Piso'}</h2>
              <button type="button" className={styles.modalClose} onClick={closeEdit} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.addFormSectionLabel}>Anuncio</p>
              <div className={styles.addFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-type">
                    Tipo
                  </label>
                  <select
                    id="edit-type"
                    className={styles.select}
                    value={editForm.type}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, type: e.target.value as 'compra' | 'alquiler' }))
                    }
                  >
                    <option value="compra">Compra</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-price">
                    Precio (€) <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    id="edit-price"
                    type="text"
                    className={styles.input}
                    inputMode="decimal"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-title">
                    Título
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    className={styles.input}
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-rooms">
                    Habitaciones
                  </label>
                  <input
                    id="edit-rooms"
                    type="text"
                    className={styles.input}
                    inputMode="numeric"
                    value={editForm.rooms}
                    onChange={(e) => setEditForm((f) => ({ ...f, rooms: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-surface">
                    m²
                  </label>
                  <input
                    id="edit-surface"
                    type="text"
                    className={styles.input}
                    inputMode="decimal"
                    value={editForm.surface}
                    onChange={(e) => setEditForm((f) => ({ ...f, surface: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-profit">
                    Rentabilidad (%)
                  </label>
                  <input
                    id="edit-profit"
                    type="text"
                    className={styles.input}
                    inputMode="decimal"
                    value={editForm.profitabilityRate}
                    onChange={(e) => setEditForm((f) => ({ ...f, profitabilityRate: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="edit-address">
                    Dirección publicada
                  </label>
                  <input
                    id="edit-address"
                    type="text"
                    className={styles.input}
                    value={editForm.publishedAddress}
                    onChange={(e) => setEditForm((f) => ({ ...f, publishedAddress: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-neighborhood">
                    Barrio
                  </label>
                  <input
                    id="edit-neighborhood"
                    type="text"
                    className={styles.input}
                    value={editForm.neighborhood}
                    onChange={(e) => setEditForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-city">
                    Ciudad
                  </label>
                  <input
                    id="edit-city"
                    type="text"
                    className={styles.input}
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-province">
                    Provincia
                  </label>
                  <input
                    id="edit-province"
                    type="text"
                    className={styles.input}
                    value={editForm.province}
                    onChange={(e) => setEditForm((f) => ({ ...f, province: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="edit-link">
                    Enlace Idealista
                  </label>
                  <input
                    id="edit-link"
                    type="url"
                    className={styles.input}
                    value={editForm.link}
                    onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))}
                  />
                </div>
              </div>

              <p className={styles.addFormSectionLabel}>Seguimiento (contactos)</p>
              <p className={styles.addFormSeguimientoHint}>
                Teléfono y “¿Llamé?” también podés ajustarlos con el icono de teléfono en la tabla, si preferís.
              </p>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="edit-cita-date">
                  Cita
                </label>
                <div className={styles.citaRow}>
                  <input
                    id="edit-cita-date"
                    type="date"
                    className={styles.input}
                    min={minDateToday()}
                    value={editForm.citaAt ? editForm.citaAt.slice(0, 10) : ''}
                    onChange={(e) => {
                      const date = e.target.value
                      const time = editForm.citaAt?.slice(11, 16) || '00:00'
                      setEditForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  />
                  <select
                    className={styles.select}
                    aria-label="Hora cita"
                    value={editForm.citaAt ? editForm.citaAt.slice(11, 16) : ''}
                    onChange={(e) => {
                      const time = e.target.value
                      const date = editForm.citaAt?.slice(0, 10) || minDateToday()
                      setEditForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  >
                    <option value="">—</option>
                    {((): string[] => {
                      const datePart = editForm.citaAt?.slice(0, 10) || ''
                      const minM = minSlotMinutesForDate(datePart)
                      if (datePart === minDateToday() && minM === null) return []
                      if (datePart === minDateToday() && minM !== null) {
                        return TIME_SLOTS_10.filter((slot) => slotMinutes(slot) >= minM)
                      }
                      return TIME_SLOTS_10
                    })().map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.addFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-contacto">
                    Quién contacta
                  </label>
                  <select
                    id="edit-contacto"
                    className={styles.select}
                    value={editForm.contacto}
                    onChange={(e) => {
                      const v = e.target.value
                      setEditForm((f) => ({
                        ...f,
                        contacto: v === 'Juli' || v === 'Kalu' ? v : '',
                      }))
                    }}
                  >
                    <option value="">—</option>
                    <option value="Juli">Juli</option>
                    <option value="Kalu">Kalu</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="edit-phone">
                    Teléfono
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    className={styles.input}
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="edit-notas">
                    Notas
                  </label>
                  <textarea
                    id="edit-notas"
                    className={styles.textarea}
                    rows={3}
                    value={editForm.notas}
                    onChange={(e) => setEditForm((f) => ({ ...f, notas: e.target.value }))}
                    placeholder="Añade notas sobre este piso…"
                  />
                </div>
                <div className={styles.addFormChecks} aria-label="Llamé y visitado">
                  <label className={styles.addFormCheckLabel}>
                    <input
                      type="checkbox"
                      checked={editForm.llamado}
                      onChange={(e) => setEditForm((f) => ({ ...f, llamado: e.target.checked }))}
                    />
                    Llamé
                  </label>
                  <label className={styles.addFormCheckLabel}>
                    <input
                      type="checkbox"
                      checked={editForm.visitado}
                      onChange={(e) => setEditForm((f) => ({ ...f, visitado: e.target.checked }))}
                    />
                    Visitado
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeEdit}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal teléfono / ¿Llamé? */}
      {editingPhoneRow && (
        <div className={styles.modalOverlay} onClick={closePhoneDialog}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Teléfono · {editingPhoneRow.publishedAddress || editingPhoneRow.title || 'Piso'}</h2>
              <button type="button" className={styles.modalClose} onClick={closePhoneDialog} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Teléfono</label>
                <input
                  type="tel"
                  className={styles.input}
                  value={phoneDialogForm.phone}
                  onChange={(e) => setPhoneDialogForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej. 612 345 678"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>¿Llamé?</label>
                <div className={styles.llameRow}>
                  <button
                    type="button"
                    className={phoneDialogForm.llamado ? styles.btnLlamadoSi : styles.btnLlamado}
                    onClick={() => setPhoneDialogForm((f) => ({ ...f, llamado: true }))}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={!phoneDialogForm.llamado ? styles.btnLlamadoNoActive : styles.btnLlamado}
                    onClick={() => setPhoneDialogForm((f) => ({ ...f, llamado: false }))}
                  >
                    No
                  </button>
                </div>
                {phoneDialogForm.llamado && (
                  <span className={styles.llameHint}>El icono se verá en verde al guardar</span>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closePhoneDialog}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={savePhoneDialog}
                disabled={savingPhone}
              >
                {savingPhone ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className={styles.modalOverlay} onClick={closeAddListing}>
          <div
            className={`${styles.modalContent} ${styles.modalContentWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Añadir piso manualmente</h2>
              <button type="button" className={styles.modalClose} onClick={closeAddListing} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.addFormHint}>
                Los campos mínimos son precio y tipo; el enlace puede ser el de Idealista o el valor por defecto.
              </p>
              <p className={styles.addFormSectionLabel}>Anuncio</p>
              <div className={styles.addFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-type">
                    Tipo
                  </label>
                  <select
                    id="add-type"
                    className={styles.select}
                    value={addForm.type}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, type: e.target.value as 'compra' | 'alquiler' }))
                    }
                  >
                    <option value="compra">Compra</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-price">
                    Precio (€) <span className={styles.labelRequired}>*</span>
                  </label>
                  <input
                    id="add-price"
                    type="text"
                    className={styles.input}
                    inputMode="decimal"
                    value={addForm.price}
                    onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="350000"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-rooms">
                    Habitaciones
                  </label>
                  <input
                    id="add-rooms"
                    type="text"
                    className={styles.input}
                    inputMode="numeric"
                    value={addForm.rooms}
                    onChange={(e) => setAddForm((f) => ({ ...f, rooms: e.target.value }))}
                    placeholder="2"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-surface">
                    m²
                  </label>
                  <input
                    id="add-surface"
                    type="text"
                    className={styles.input}
                    inputMode="decimal"
                    value={addForm.surface}
                    onChange={(e) => setAddForm((f) => ({ ...f, surface: e.target.value }))}
                    placeholder="75"
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="add-address">
                    Dirección publicada
                  </label>
                  <input
                    id="add-address"
                    type="text"
                    className={styles.input}
                    value={addForm.publishedAddress}
                    onChange={(e) => setAddForm((f) => ({ ...f, publishedAddress: e.target.value }))}
                    placeholder="Calle, número, barrio…"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-neighborhood">
                    Barrio
                  </label>
                  <input
                    id="add-neighborhood"
                    type="text"
                    className={styles.input}
                    value={addForm.neighborhood}
                    onChange={(e) => setAddForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-province">
                    Provincia
                  </label>
                  <input
                    id="add-province"
                    type="text"
                    className={styles.input}
                    value={addForm.province}
                    onChange={(e) => setAddForm((f) => ({ ...f, province: e.target.value }))}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="add-link">
                    Enlace Idealista
                  </label>
                  <input
                    id="add-link"
                    type="url"
                    className={styles.input}
                    value={addForm.link}
                    onChange={(e) => setAddForm((f) => ({ ...f, link: e.target.value }))}
                    placeholder="https://www.idealista.com/…"
                  />
                </div>
              </div>

              <p className={styles.addFormSectionLabel}>
                Seguimiento (contactos) <span className={styles.addFormAllOptional}>(todo opcional)</span>
              </p>
              <p className={styles.addFormSeguimientoHint}>
                Podés dejar vacía toda esta sección y completarla después en la tabla o en el gestor.
              </p>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="add-cita-date">
                  Cita
                </label>
                <div className={styles.citaRow}>
                  <input
                    id="add-cita-date"
                    type="date"
                    className={styles.input}
                    min={minDateToday()}
                    value={addForm.citaAt ? addForm.citaAt.slice(0, 10) : ''}
                    onChange={(e) => {
                      const date = e.target.value
                      const time = addForm.citaAt?.slice(11, 16) || '00:00'
                      setAddForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  />
                  <select
                    className={styles.select}
                    value={addForm.citaAt ? addForm.citaAt.slice(11, 16) : ''}
                    onChange={(e) => {
                      const time = e.target.value
                      const date = addForm.citaAt?.slice(0, 10) || minDateToday()
                      setAddForm((f) => ({ ...f, citaAt: date ? `${date}T${time}` : '' }))
                    }}
                  >
                    <option value="">—</option>
                    {((): string[] => {
                      const datePart = addForm.citaAt?.slice(0, 10) || ''
                      const minM = minSlotMinutesForDate(datePart)
                      if (datePart === minDateToday() && minM === null) return []
                      if (datePart === minDateToday() && minM !== null) {
                        return TIME_SLOTS_10.filter((slot) => slotMinutes(slot) >= minM)
                      }
                      return TIME_SLOTS_10
                    })().map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.addFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-contacto">
                    Quién contacta
                  </label>
                  <select
                    id="add-contacto"
                    className={styles.select}
                    value={addForm.contacto}
                    onChange={(e) => {
                      const v = e.target.value
                      setAddForm((f) => ({
                        ...f,
                        contacto: v === 'Juli' || v === 'Kalu' ? v : '',
                      }))
                    }}
                  >
                    <option value="">—</option>
                    <option value="Juli">Juli</option>
                    <option value="Kalu">Kalu</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="add-phone">
                    Teléfono
                  </label>
                  <input
                    id="add-phone"
                    type="tel"
                    className={styles.input}
                    value={addForm.phone}
                    onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.addFormGridFull}`}>
                  <label className={styles.label} htmlFor="add-notas">
                    Notas
                  </label>
                  <textarea
                    id="add-notas"
                    className={styles.textarea}
                    rows={3}
                    value={addForm.notas}
                    onChange={(e) => setAddForm((f) => ({ ...f, notas: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className={styles.addFormChecks} aria-label="Llamé y visitado (opcionales)">
                  <label className={styles.addFormCheckLabel}>
                    <input
                      type="checkbox"
                      checked={addForm.llamado}
                      onChange={(e) => setAddForm((f) => ({ ...f, llamado: e.target.checked }))}
                    />
                    Llamé
                  </label>
                  <label className={styles.addFormCheckLabel}>
                    <input
                      type="checkbox"
                      checked={addForm.visitado}
                      onChange={(e) => setAddForm((f) => ({ ...f, visitado: e.target.checked }))}
                    />
                    Visitado
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={closeAddListing}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={saveAddListing}
                disabled={savingAdd}
              >
                {savingAdd ? 'Guardando…' : 'Crear piso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

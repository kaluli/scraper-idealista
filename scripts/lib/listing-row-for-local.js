/**
 * Normaliza filas de listings desde prod (MySQL antiguo, JSON export, Prisma)
 * al shape actual del modelo Listing (sin cita/contactos — van en user_listing_states).
 */

function toDate(v) {
  if (v instanceof Date) return v
  if (v == null) return new Date()
  return new Date(String(v))
}

function listingRowForLocal(row) {
  return {
    id: Number(row.id),
    title: row.title ?? null,
    price: Number(row.price),
    surface: row.surface != null ? Number(row.surface) : null,
    link: row.link,
    profitabilityRate:
      row.profitabilityRate != null ? Number(row.profitabilityRate) : null,
    type: row.type,
    neighborhood: row.neighborhood ?? null,
    city: row.city ?? null,
    province: row.province ?? null,
    publishedAddress: row.publishedAddress ?? null,
    rooms: row.rooms != null ? Number(row.rooms) : null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }
}

function neighborhoodRowForLocal(row) {
  return {
    id: Number(row.id),
    name: row.name,
    province: row.province,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  }
}

module.exports = { listingRowForLocal, neighborhoodRowForLocal, toDate }

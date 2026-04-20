import type { Prisma } from '@prisma/client'

/** Coincide con el nombre en seed / filtros (municipio Comunidad de Madrid). */
export const MUNICIPIO_ALCALA_HENARES = 'Alcalá de Henares'

/**
 * Idealista suele guardar el distrito en `neighborhood` (Centro, …) y el municipio en `city`.
 * Filtrar por «Alcalá de Henares» debe incluir ambos casos.
 */
export function listingNeighborhoodClause(
  neighborhood: string | null | undefined
): Prisma.ListingWhereInput | undefined {
  if (!neighborhood || neighborhood === 'all') return undefined
  if (neighborhood === MUNICIPIO_ALCALA_HENARES) {
    return {
      OR: [
        { neighborhood: MUNICIPIO_ALCALA_HENARES },
        { city: MUNICIPIO_ALCALA_HENARES },
        { city: 'Alcala de Henares' },
      ],
    }
  }
  return { neighborhood }
}

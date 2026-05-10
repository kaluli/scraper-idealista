import type { Prisma } from '@prisma/client'
import { listingNeighborhoodClause } from '@/lib/neighborhood-filter'

/** Misma lógica que GET /api/listings para filtros en URLSearchParams. */
export function buildListingWhereFromSearchParams(
  searchParams: URLSearchParams
): Prisma.ListingWhereInput {
  const type = searchParams.get('type')
  const neighborhood = searchParams.get('neighborhood')
  const province = searchParams.get('province')
  const maxPrice = searchParams.get('maxPrice')

  const where: Prisma.ListingWhereInput = {}

  if (type && (type === 'alquiler' || type === 'compra')) {
    where.type = type
  }

  const nbClause = listingNeighborhoodClause(neighborhood)
  if (nbClause) Object.assign(where, nbClause)

  if (province && province !== 'all') {
    if (province === 'Madrid') {
      where.province = { in: ['Madrid', 'Alcalá de Henares'] }
    } else {
      where.province = province
    }
  }

  if (maxPrice) {
    where.price = {
      lte: parseFloat(maxPrice),
    }
  }

  return where
}

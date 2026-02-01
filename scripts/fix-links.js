const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Datos de referencia para corregir links
const referenceData = [
  {
    link: "https://www.idealista.com/inmueble/120",
    direccion: "Calle La Flota, s/n",
    precio: 125000,
    metros: 44
  },
  {
    link: "https://www.idealista.com/inmueble/121",
    direccion: "La Flota, Murcia",
    precio: 117000,
    metros: 35
  },
  {
    link: "https://www.idealista.com/inmueble/122",
    direccion: "Calle Músico Antonio Rodríguez de Hita",
    precio: 126000,
    metros: 40
  },
  {
    link: "https://www.idealista.com/inmueble/123",
    direccion: "La Flota, Murcia",
    precio: 197500,
    metros: 85
  },
  {
    link: "https://www.idealista.com/inmueble/124",
    direccion: "Calle Corregidor Vicente Cano Altares, 2",
    precio: 124500, // Rango: 124.500€ – 129.000€, usar mínimo
    metros: 39
  },
  {
    link: "https://www.idealista.com/inmueble/127",
    direccion: "Calle La Flota, 10",
    precio: 125000,
    metros: 35
  },
  {
    link: "https://www.idealista.com/inmueble/128",
    direccion: "Calle Ciudad de Cádiz",
    precio: 200000,
    metros: 136
  },
  {
    link: "https://www.idealista.com/inmueble/129",
    direccion: "La Flota, Murcia",
    precio: 105000,
    metros: 40
  },
  {
    link: "https://www.idealista.com/inmueble/130",
    direccion: "La Flota, Murcia",
    precio: 145000,
    metros: 47
  }
];

// Función para normalizar direcciones para comparación
function normalizeAddress(addr) {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Función para extraer dirección base (sin número)
function getBaseAddress(addr) {
  if (!addr) return '';
  const normalized = normalizeAddress(addr);
  // Remover números al final
  return normalized.replace(/,\s*\d+.*$/, '').trim();
}

async function fixLinks() {
  try {
    console.log('🔍 Buscando pisos similares para corregir links...\n');

    let updated = 0;
    let notFound = 0;

    for (const ref of referenceData) {
      // Buscar por dirección y precio/metros similares
      const listings = await prisma.listing.findMany({
        where: {
          OR: [
            // Coincidencia exacta de dirección
            {
              publishedAddress: {
                contains: ref.direccion.split(',')[0], // Primera parte de la dirección
              }
            },
            // O dirección que contenga palabras clave
            {
              publishedAddress: {
                contains: ref.direccion.includes('La Flota') ? 'La Flota' : ref.direccion.split(',')[0],
              }
            }
          ],
          // Precio similar (con margen de ±10% para ser más flexible)
          price: {
            gte: ref.precio * 0.90,
            lte: ref.precio * 1.10,
          },
          // Metros similares (con margen de ±10% para ser más flexible)
          surface: {
            gte: ref.metros * 0.90,
            lte: ref.metros * 1.10,
          },
          type: 'compra' // Estos son todos de compra
        },
      });

      if (listings.length > 0) {
        // Encontrar la mejor coincidencia
        let bestMatch = listings[0];
        let bestScore = 0;

        for (const listing of listings) {
          let score = 0;
          const listingAddr = normalizeAddress(listing.publishedAddress || '');
          const refAddr = normalizeAddress(ref.direccion);

          // Coincidencia exacta de dirección
          if (listingAddr === refAddr) {
            score += 100;
          } else if (listingAddr.includes(refAddr.split(',')[0]) || refAddr.includes(listingAddr.split(',')[0])) {
            score += 50;
          }

          // Coincidencia de precio (más cercano = mejor)
          const priceDiff = Math.abs(listing.price - ref.precio);
          score += Math.max(0, 50 - (priceDiff / ref.precio) * 50);

          // Coincidencia de metros (más cercano = mejor)
          if (listing.surface) {
            const surfaceDiff = Math.abs(listing.surface - ref.metros);
            score += Math.max(0, 30 - (surfaceDiff / ref.metros) * 30);
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = listing;
          }
        }

        // Actualizar el link si la coincidencia es buena (score > 30, más flexible)
        if (bestScore > 30 && bestMatch.link !== ref.link) {
          await prisma.listing.update({
            where: { id: bestMatch.id },
            data: { link: ref.link },
          });
          updated++;
          console.log(`✅ ID ${bestMatch.id}: Link actualizado a ${ref.link}`);
          console.log(`   Dirección: ${bestMatch.publishedAddress}`);
          console.log(`   Precio: ${bestMatch.price}€ (ref: ${ref.precio}€)`);
          console.log(`   Metros: ${bestMatch.surface || 'N/A'} (ref: ${ref.metros})`);
          console.log('');
        } else {
          notFound++;
          console.log(`⚠️  No se encontró coincidencia buena para ${ref.link}`);
          console.log(`   Buscando: ${ref.direccion}, ${ref.precio}€, ${ref.metros}m²`);
          console.log('');
        }
      } else {
        notFound++;
        console.log(`⚠️  No se encontró ningún piso para ${ref.link}`);
        console.log(`   Buscando: ${ref.direccion}, ${ref.precio}€, ${ref.metros}m²`);
        console.log('');
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`✅ Links actualizados: ${updated}`);
    console.log(`⚠️  No encontrados: ${notFound}`);
    console.log(`📋 Total procesados: ${referenceData.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixLinks();


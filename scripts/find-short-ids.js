const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findShortIds() {
  try {
    console.log('🔍 Buscando pisos con ID de Idealista de 1-3 dígitos...\n');

    // Obtener todos los listings
    const allListings = await prisma.listing.findMany({
      select: {
        id: true,
        link: true,
        publishedAddress: true,
        price: true,
        surface: true,
        type: true,
      },
    });

    // Filtrar aquellos con ID de 1-3 dígitos
    const shortIdListings = allListings.filter(listing => {
      const match = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
      if (match) {
        const id = match[1];
        return id.length >= 1 && id.length <= 3;
      }
      return false;
    });

    // Ordenar por el ID numérico
    shortIdListings.sort((a, b) => {
      const idA = parseInt(a.link.match(/idealista\.com\/inmueble\/(\d+)/)?.[1] || '0');
      const idB = parseInt(b.link.match(/idealista\.com\/inmueble\/(\d+)/)?.[1] || '0');
      return idA - idB;
    });

    console.log(`📊 Total encontrados: ${shortIdListings.length}\n`);

    if (shortIdListings.length > 0) {
      console.log('📋 Listado de pisos con ID corto:\n');
      shortIdListings.forEach((listing, index) => {
        const idMatch = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
        const idealistaId = idMatch ? idMatch[1] : 'N/A';
        console.log(`${index + 1}. ID Idealista: ${idealistaId}`);
        console.log(`   DB ID: ${listing.id}`);
        console.log(`   Link: ${listing.link}`);
        console.log(`   Dirección: ${listing.publishedAddress || 'Sin dirección'}`);
        console.log(`   Precio: ${listing.price}€`);
        console.log(`   Metros: ${listing.surface || 'N/A'}m²`);
        console.log(`   Tipo: ${listing.type}`);
        console.log('');
      });

      // Exportar a JSON
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const filename = `pisos_short_ids_${timestamp}.json`;
      fs.writeFileSync(
        filename,
        JSON.stringify(shortIdListings, null, 2),
        'utf-8'
      );
      console.log(`\n💾 Exportado a: ${filename}`);
    } else {
      console.log('⚠️  No se encontraron pisos con ID de 1-3 dígitos.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

findShortIds();



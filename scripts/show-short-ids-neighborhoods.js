const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showNeighborhoods() {
  try {
    console.log('🔍 Barrios de pisos con ID de 1-3 dígitos...\n');

    // Obtener todos los listings
    const allListings = await prisma.listing.findMany({
      select: {
        id: true,
        link: true,
        neighborhood: true,
        publishedAddress: true,
        price: true,
        surface: true,
        type: true,
        city: true,
        province: true,
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

    console.log(`📊 Total: ${shortIdListings.length} pisos\n`);
    console.log('📋 Listado por barrio:\n');

    // Agrupar por barrio
    const byNeighborhood = {};
    shortIdListings.forEach(listing => {
      const neighborhood = listing.neighborhood || 'Sin barrio';
      if (!byNeighborhood[neighborhood]) {
        byNeighborhood[neighborhood] = [];
      }
      byNeighborhood[neighborhood].push(listing);
    });

    // Mostrar por barrio
    Object.keys(byNeighborhood).sort().forEach(neighborhood => {
      const listings = byNeighborhood[neighborhood];
      console.log(`🏘️  ${neighborhood} (${listings.length} pisos):`);
      listings.forEach(listing => {
        const idMatch = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
        const idealistaId = idMatch ? idMatch[1] : 'N/A';
        console.log(`   - ID ${idealistaId} (DB: ${listing.id}): ${listing.publishedAddress || 'Sin dirección'}`);
        console.log(`     ${listing.price}€ | ${listing.surface || 'N/A'}m² | ${listing.type}`);
      });
      console.log('');
    });

    // Resumen estadístico
    console.log('\n📊 RESUMEN POR BARRIO:');
    console.log('='.repeat(50));
    Object.keys(byNeighborhood)
      .sort((a, b) => byNeighborhood[b].length - byNeighborhood[a].length)
      .forEach(neighborhood => {
        const count = byNeighborhood[neighborhood].length;
        const alquiler = byNeighborhood[neighborhood].filter(l => l.type === 'alquiler').length;
        const compra = byNeighborhood[neighborhood].filter(l => l.type === 'compra').length;
        console.log(`${neighborhood}: ${count} pisos (${alquiler} alquiler, ${compra} compra)`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

showNeighborhoods();



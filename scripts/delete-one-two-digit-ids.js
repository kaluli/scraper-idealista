const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteOneTwoDigitIds() {
  try {
    console.log('🗑️  Eliminando pisos con ID de Idealista de 1-2 dígitos...\n');

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
      },
    });

    // Filtrar aquellos con ID de 1-2 dígitos (no 3 dígitos)
    const shortIdListings = allListings.filter(listing => {
      const match = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
      if (match) {
        const id = match[1];
        return id.length >= 1 && id.length <= 2; // Solo 1 o 2 dígitos
      }
      return false;
    });

    console.log(`📊 Encontrados ${shortIdListings.length} pisos para eliminar\n`);

    if (shortIdListings.length === 0) {
      console.log('⚠️  No hay pisos para eliminar.');
      return;
    }

    // Mostrar resumen antes de eliminar
    console.log('📋 Pisos que se eliminarán:');
    shortIdListings.forEach((listing, index) => {
      const idMatch = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
      const idealistaId = idMatch ? idMatch[1] : 'N/A';
      console.log(`${index + 1}. ID ${idealistaId} (DB: ${listing.id}): ${listing.publishedAddress || 'Sin dirección'}`);
    });

    console.log('\n🗑️  Eliminando...\n');

    // Eliminar los pisos
    let deleted = 0;
    let errors = 0;

    for (const listing of shortIdListings) {
      try {
        await prisma.listing.delete({
          where: { id: listing.id },
        });
        deleted++;
        const idMatch = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
        const idealistaId = idMatch ? idMatch[1] : 'N/A';
        console.log(`✅ Eliminado ID ${idealistaId} (DB: ${listing.id})`);
      } catch (error) {
        errors++;
        console.error(`❌ Error al eliminar ID ${listing.id}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${shortIdListings.length}`);

    // Verificar que se eliminaron
    const remaining = await prisma.listing.findMany({
      where: {
        link: {
          contains: 'idealista.com/inmueble/',
        },
      },
    });

    const remainingShortIds = remaining.filter(listing => {
      const match = listing.link.match(/idealista\.com\/inmueble\/(\d+)/);
      if (match) {
        const id = match[1];
        return id.length >= 1 && id.length <= 2;
      }
      return false;
    });

    if (remainingShortIds.length > 0) {
      console.log(`\n⚠️  Aún quedan ${remainingShortIds.length} pisos con ID de 1-2 dígitos.`);
    } else {
      console.log(`\n✅ Todos los pisos con ID de 1-2 dígitos han sido eliminados.`);
    }

    // Mostrar estadísticas finales
    const totalRemaining = await prisma.listing.count();
    console.log(`\n📊 Total de pisos restantes en la base de datos: ${totalRemaining}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOneTwoDigitIds();



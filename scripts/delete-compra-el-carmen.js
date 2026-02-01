const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteCompraElCarmen() {
  try {
    console.log('🗑️  Eliminando pisos de compra en El Carmen...\n');

    // Buscar todos los pisos de compra en El Carmen
    const listingsToDelete = await prisma.listing.findMany({
      where: {
        type: 'compra',
        neighborhood: 'El Carmen',
      },
      select: {
        id: true,
        link: true,
        title: true,
        publishedAddress: true,
        price: true,
        surface: true,
      },
    });

    console.log(`📊 Encontrados ${listingsToDelete.length} pisos para eliminar\n`);

    if (listingsToDelete.length === 0) {
      console.log('⚠️  No hay pisos de compra en El Carmen para eliminar.');
      return;
    }

    // Mostrar resumen antes de eliminar (solo primeros 10)
    console.log('📋 Pisos que se eliminarán (mostrando primeros 10):');
    listingsToDelete.slice(0, 10).forEach((listing, index) => {
      console.log(`${index + 1}. ID ${listing.id}: ${listing.title || 'Sin título'}`);
      console.log(`   ${listing.publishedAddress || 'Sin dirección'} - ${listing.price}€ - ${listing.surface || 'N/A'}m²`);
    });
    if (listingsToDelete.length > 10) {
      console.log(`   ... y ${listingsToDelete.length - 10} más.`);
    }

    console.log('\n🗑️  Eliminando...\n');

    // Eliminar los pisos
    let deleted = 0;
    let errors = 0;

    for (const listing of listingsToDelete) {
      try {
        await prisma.listing.delete({
          where: { id: listing.id },
        });
        deleted++;
        if (deleted % 10 === 0 || deleted === listingsToDelete.length) {
          console.log(`✅ Eliminados ${deleted}/${listingsToDelete.length}...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error al eliminar ID ${listing.id}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Eliminados: ${deleted}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${listingsToDelete.length}`);

    // Verificar que se eliminaron
    const remaining = await prisma.listing.count({
      where: {
        type: 'compra',
        neighborhood: 'El Carmen',
      },
    });

    if (remaining > 0) {
      console.log(`\n⚠️  Aún quedan ${remaining} pisos de compra en El Carmen.`);
    } else {
      console.log(`\n✅ Todos los pisos de compra en El Carmen han sido eliminados.`);
    }

    // Mostrar estadísticas finales
    const totalRemaining = await prisma.listing.count();
    const totalElCarmen = await prisma.listing.count({
      where: {
        neighborhood: 'El Carmen',
      },
    });
    console.log(`\n📊 Estadísticas:`);
    console.log(`   - Total de pisos restantes: ${totalRemaining}`);
    console.log(`   - Total en El Carmen (todos los tipos): ${totalElCarmen}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteCompraElCarmen();



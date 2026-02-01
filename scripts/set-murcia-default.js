const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setMurciaDefault() {
  try {
    console.log('🔧 Estableciendo "Murcia" como provincia por defecto...\n');

    // Buscar todos los pisos que no tienen provincia o tienen un valor diferente a "Murcia"
    const listingsToUpdate = await prisma.listing.findMany({
      where: {
        OR: [
          { province: null },
          { province: { not: 'Murcia' } },
        ],
      },
      select: {
        id: true,
        link: true,
        province: true,
      },
    });

    console.log(`📊 Encontrados ${listingsToUpdate.length} pisos para actualizar\n`);

    if (listingsToUpdate.length === 0) {
      console.log('✅ Todos los pisos ya tienen "Murcia" como provincia.');
      
      // Verificar también los barrios
      const neighborhoodsToUpdate = await prisma.neighborhood.findMany({
        where: {
          OR: [
            { province: null },
            { province: { not: 'Murcia' } },
          ],
        },
      });

      if (neighborhoodsToUpdate.length > 0) {
        console.log(`\n📊 Actualizando ${neighborhoodsToUpdate.length} barrios...`);
        for (const neighborhood of neighborhoodsToUpdate) {
          await prisma.neighborhood.update({
            where: { id: neighborhood.id },
            data: { province: 'Murcia' },
          });
          console.log(`✅ Barrio actualizado: ${neighborhood.name}`);
        }
      } else {
        console.log('✅ Todos los barrios ya tienen "Murcia" como provincia.');
      }
      
      return;
    }

    // Mostrar algunos ejemplos
    console.log('📋 Ejemplos de pisos a actualizar (primeros 5):');
    listingsToUpdate.slice(0, 5).forEach((listing, index) => {
      console.log(`${index + 1}. ID ${listing.id}: ${listing.province || 'NULL'} → Murcia`);
    });
    if (listingsToUpdate.length > 5) {
      console.log(`   ... y ${listingsToUpdate.length - 5} más.`);
    }

    console.log('\n🔄 Actualizando...\n');

    // Actualizar los pisos
    let updated = 0;
    let errors = 0;

    for (const listing of listingsToUpdate) {
      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { province: 'Murcia' },
        });
        updated++;
        if (updated % 50 === 0 || updated === listingsToUpdate.length) {
          console.log(`✅ Actualizados ${updated}/${listingsToUpdate.length}...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error al actualizar ID ${listing.id}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN DE PISOS:');
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${listingsToUpdate.length}`);

    // Actualizar también los barrios
    const neighborhoodsToUpdate = await prisma.neighborhood.findMany({
      where: {
        OR: [
          { province: null },
          { province: { not: 'Murcia' } },
        ],
      },
    });

    if (neighborhoodsToUpdate.length > 0) {
      console.log(`\n📊 Actualizando ${neighborhoodsToUpdate.length} barrios...`);
      for (const neighborhood of neighborhoodsToUpdate) {
        try {
          await prisma.neighborhood.update({
            where: { id: neighborhood.id },
            data: { province: 'Murcia' },
          });
          console.log(`✅ Barrio actualizado: ${neighborhood.name}`);
        } catch (error) {
          console.error(`❌ Error al actualizar barrio ${neighborhood.id}:`, error.message);
        }
      }
    }

    // Verificar que todos tienen Murcia
    const remainingListings = await prisma.listing.count({
      where: {
        OR: [
          { province: null },
          { province: { not: 'Murcia' } },
        ],
      },
    });

    const remainingNeighborhoods = await prisma.neighborhood.count({
      where: {
        OR: [
          { province: null },
          { province: { not: 'Murcia' } },
        ],
      },
    });

    if (remainingListings === 0 && remainingNeighborhoods === 0) {
      console.log(`\n✅ Todos los pisos y barrios tienen "Murcia" como provincia.`);
    } else {
      console.log(`\n⚠️  Aún quedan ${remainingListings} pisos y ${remainingNeighborhoods} barrios sin "Murcia".`);
    }

    // Mostrar estadísticas finales
    const totalListings = await prisma.listing.count();
    const totalNeighborhoods = await prisma.neighborhood.count();
    const murciaListings = await prisma.listing.count({
      where: { province: 'Murcia' },
    });
    const murciaNeighborhoods = await prisma.neighborhood.count({
      where: { province: 'Murcia' },
    });

    console.log(`\n📊 Estadísticas finales:`);
    console.log(`   - Total pisos: ${totalListings} (${murciaListings} con Murcia)`);
    console.log(`   - Total barrios: ${totalNeighborhoods} (${murciaNeighborhoods} con Murcia)`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setMurciaDefault();



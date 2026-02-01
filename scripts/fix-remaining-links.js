const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRemainingLinks() {
  try {
    console.log('🔍 Buscando y corrigiendo los links faltantes (123, 128)...\n');

    // Link 123: 197500€, 85m², La Flota
    const candidates123 = await prisma.listing.findMany({
      where: {
        publishedAddress: {
          contains: 'Flota',
        },
        price: {
          gte: 195000,
          lte: 200000,
        },
        surface: {
          gte: 80,
          lte: 90,
        },
        type: 'compra',
      },
    });

    if (candidates123.length > 0) {
      const best123 = candidates123[0];
      if (best123.link !== 'https://www.idealista.com/inmueble/123') {
        await prisma.listing.update({
          where: { id: best123.id },
          data: { link: 'https://www.idealista.com/inmueble/123' },
        });
        console.log(`✅ ID ${best123.id}: Link actualizado a https://www.idealista.com/inmueble/123`);
        console.log(`   Dirección: ${best123.publishedAddress}`);
        console.log(`   Precio: ${best123.price}€ (ref: 197500€)`);
        console.log(`   Metros: ${best123.surface || 'N/A'} (ref: 85)`);
      } else {
        console.log(`ℹ️  Link 123 ya está correcto en ID ${best123.id}`);
      }
    } else {
      console.log(`⚠️  No se encontró piso para link 123 (197500€, 85m², La Flota)`);
    }

    console.log('');

    // Link 128: 200000€, 136m², Calle Ciudad de Cádiz
    const candidates128 = await prisma.listing.findMany({
      where: {
        OR: [
          {
            publishedAddress: {
              contains: 'Ciudad de Cádiz',
            },
          },
          {
            publishedAddress: {
              contains: 'Cádiz',
            },
          },
        ],
        price: {
          gte: 195000,
          lte: 205000,
        },
        surface: {
          gte: 130,
          lte: 140,
        },
        type: 'compra',
      },
    });

    if (candidates128.length > 0) {
      const best128 = candidates128[0];
      if (best128.link !== 'https://www.idealista.com/inmueble/128') {
        await prisma.listing.update({
          where: { id: best128.id },
          data: { link: 'https://www.idealista.com/inmueble/128' },
        });
        console.log(`✅ ID ${best128.id}: Link actualizado a https://www.idealista.com/inmueble/128`);
        console.log(`   Dirección: ${best128.publishedAddress}`);
        console.log(`   Precio: ${best128.price}€ (ref: 200000€)`);
        console.log(`   Metros: ${best128.surface || 'N/A'} (ref: 136)`);
      } else {
        console.log(`ℹ️  Link 128 ya está correcto en ID ${best128.id}`);
      }
    } else {
      console.log(`⚠️  No se encontró piso para link 128 (200000€, 136m², Calle Ciudad de Cádiz)`);
    }

    console.log('\n📊 Verificando todos los links objetivo...\n');

    const targetLinks = [
      'https://www.idealista.com/inmueble/120',
      'https://www.idealista.com/inmueble/121',
      'https://www.idealista.com/inmueble/122',
      'https://www.idealista.com/inmueble/123',
      'https://www.idealista.com/inmueble/124',
      'https://www.idealista.com/inmueble/127',
      'https://www.idealista.com/inmueble/128',
      'https://www.idealista.com/inmueble/129',
      'https://www.idealista.com/inmueble/130',
    ];

    for (const link of targetLinks) {
      const listing = await prisma.listing.findFirst({
        where: { link },
      });
      if (listing) {
        console.log(`✅ ${link} - ID: ${listing.id}, ${listing.publishedAddress || 'Sin dirección'}`);
      } else {
        console.log(`⚠️  ${link} - No encontrado`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingLinks();



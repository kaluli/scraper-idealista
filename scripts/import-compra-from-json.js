const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importCompraListings() {
  try {
    console.log('📦 Importando pisos de compra desde JSON...\n');

    // Leer el archivo JSON
    const filePath = path.join(process.cwd(), '../../Downloads/idealista_listings.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // Extraer todos los pisos de todas las claves
    const allListings = [];
    for (const key in jsonData) {
      if (Array.isArray(jsonData[key])) {
        allListings.push(...jsonData[key]);
      }
    }

    console.log(`📊 Total de pisos en el JSON: ${allListings.length}\n`);

    // Filtrar y normalizar
    const listingsToImport = [];
    const seenLinks = new Set();

    for (const listing of allListings) {
      // Verificar que tenga link
      if (!listing.link) {
        continue;
      }

      // Verificar que no sea duplicado
      if (seenLinks.has(listing.link)) {
        continue;
      }

      // Verificar precio >= 3000
      const price = listing.precio_eur_mes || listing.precio || 0;
      if (price < 3000) {
        continue;
      }

      // Verificar que no exista ya en la base de datos
      const existing = await prisma.listing.findFirst({
        where: { link: listing.link },
      });

      if (existing) {
        continue;
      }

      // Normalizar para compra
      const normalizedListing = {
        link: listing.link,
        barrio: listing.barrio || listing.neighborhood || null,
        direccion_publicada: listing.direccion_publicada || listing.publishedAddress || null,
        precio_venta_eur: price, // Convertir precio_eur_mes a precio_venta_eur
        metros_cuadrados: listing.metros_cuadrados || listing.m2 || listing.surface || null,
        habitaciones: listing.habitaciones || listing.rooms || null,
        titulo: listing.titulo || listing.title || null,
        ciudad: listing.ciudad || listing.city || null,
        province: listing.province || 'Murcia',
        tipo: 'compra', // Forzar tipo compra
      };

      listingsToImport.push(normalizedListing);
      seenLinks.add(listing.link);
    }

    console.log(`✅ Pisos válidos para importar: ${listingsToImport.length}`);
    console.log(`   - Precio >= 3000: ${listingsToImport.length}`);
    console.log(`   - Sin duplicados: ${listingsToImport.length}\n`);

    if (listingsToImport.length === 0) {
      console.log('⚠️  No hay pisos para importar.');
      return;
    }

    // Importar
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const listing of listingsToImport) {
      try {
        // Normalizar barrio
        let neighborhood = listing.barrio;
        let city = listing.ciudad;

        if (neighborhood && neighborhood.includes(',')) {
          const parts = neighborhood.split(',').map(p => p.trim());
          if (parts.length > 1) {
            neighborhood = parts[0].trim();
            city = parts[parts.length - 1].trim();
          }
        }

        // Normalizar nombre del barrio conocido
        if (neighborhood) {
          if (neighborhood.includes('Juan Carlos I') || neighborhood.includes('Juan de Borbón') || neighborhood.includes('Avenida de Europa')) {
            neighborhood = 'Juan Carlos I (Juan de Borbón)';
          } else if (neighborhood.includes('Santa Eulalia') || neighborhood.includes('Centro – Santa Eulalia')) {
            neighborhood = 'Centro – Santa Eulalia';
          } else if (neighborhood.includes('Espinardo')) {
            neighborhood = 'Espinardo';
          } else if (neighborhood.includes('San Lorenzo')) {
            neighborhood = 'San Lorenzo';
          } else if (neighborhood.includes('Vistalegre')) {
            neighborhood = 'Vistalegre';
          } else if (neighborhood.includes('El Carmen')) {
            neighborhood = 'El Carmen';
          } else if (neighborhood.includes('Santa Catalina-San Bartolomé') || neighborhood.includes('Santa Catalina-San Bartolomé')) {
            neighborhood = 'Santa Catalina-San Bartolomé';
          }
        }

        await prisma.listing.create({
          data: {
            link: listing.link,
            neighborhood: neighborhood,
            publishedAddress: listing.direccion_publicada,
            price: parseFloat(listing.precio_venta_eur),
            surface: listing.metros_cuadrados ? parseFloat(listing.metros_cuadrados) : null,
            rooms: listing.habitaciones !== undefined ? (listing.habitaciones === null ? null : parseInt(listing.habitaciones)) : null,
            type: 'compra', // Forzar tipo compra
            title: listing.titulo,
            city: city,
            province: listing.province || 'Murcia',
            profitabilityRate: null,
          },
        });

        imported++;
        if (imported % 10 === 0) {
          console.log(`   Importados ${imported}/${listingsToImport.length}...`);
        }
      } catch (error) {
        skipped++;
        errors.push({ link: listing.link, error: error.message });
        console.error(`❌ Error importando ${listing.link}:`, error.message);
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Importados: ${imported}`);
    console.log(`⚠️  Omitidos/Errores: ${skipped}`);
    console.log(`📋 Total procesados: ${listingsToImport.length}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errores:');
      errors.forEach(err => {
        console.log(`   - ${err.link}: ${err.error}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errores (mostrando primeros 5):`);
      errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.link}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importCompraListings();



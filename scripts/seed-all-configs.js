import { prisma } from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';

async function seedAllConfigs() {
  console.log('🌱 Seeding all configuration files...');

  try {
    const configDir = path.join(process.cwd(), 'config');
    const configFiles = fs.readdirSync(configDir).filter(file => file.endsWith('.json'));

    console.log(`📁 Found ${configFiles.length} config files:`, configFiles);

    // Process each config file
    for (const fileName of configFiles) {
      const filePath = path.join(configDir, fileName);
      const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Determine scheme from filename
      let scheme = '';
      if (fileName.startsWith('iksi-utama')) {
        scheme = 'utama';
      } else if (fileName.startsWith('iksi-tersier')) {
        scheme = 'tersier';
      } else if (fileName.startsWith('kuesioner-')) {
        // Extract scheme from kuesioner filename (e.g., kuesioner-bangunan.json -> bangunan)
        scheme = fileName.replace('kuesioner-', '').replace('.json', '');
      } else {
        console.warn(`⚠️  Skipping unknown config file: ${fileName}`);
        continue;
      }

      console.log(`📝 Processing ${fileName} for scheme: ${scheme}`);

      // Deactivate existing configs for this scheme
      await prisma.config.updateMany({
        where: { scheme: scheme },
        data: { active: false }
      });

      // Create new active config
      const result = await prisma.config.create({
        data: {
          scheme: scheme,
          json: configData,
          active: true
        }
      });

      console.log(`✅ ${scheme} config created: ID ${result.id}`);
    }

    // Verify all configurations
    const allConfigs = await prisma.config.findMany({
      select: {
        id: true,
        scheme: true,
        active: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n📊 All configurations in database:');
    allConfigs.forEach(config => {
      console.log(`  - ${config.scheme}: ${config.active ? 'ACTIVE' : 'INACTIVE'} (ID: ${config.id})`);
    });

    const activeConfigs = allConfigs.filter(c => c.active);
    console.log(`\n🎉 Seeding completed! ${activeConfigs.length} active configurations.`);

  } catch (error) {
    console.error('❌ Error seeding configurations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllConfigs().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedAllConfigs };
import { prisma } from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';

async function seedConfigs() {
  console.log('🌱 Seeding survey configurations...');
  
  try {
    // Read configuration files
    const utamaConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'config', 'survey-utama.json'), 'utf8')
    );
    
    const tersierConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'config', 'survey-tersier.json'), 'utf8')
    );
    
    // Insert or update Utama configuration
    console.log('📝 Creating Utama configuration...');
    
    // First, deactivate existing configs for this scheme
    await prisma.config.updateMany({
      where: { scheme: 'utama' },
      data: { active: false }
    });
    
    // Create new active config
    const utamaResult = await prisma.config.create({
      data: {
        scheme: 'utama',
        json: utamaConfig,
        active: true
      }
    });
    console.log(`✅ Utama config created: ID ${utamaResult.id}`);
    
    // Insert or update Tersier configuration
    console.log('📝 Creating Tersier configuration...');
    
    // First, deactivate existing configs for this scheme
    await prisma.config.updateMany({
      where: { scheme: 'tersier' },
      data: { active: false }
    });
    
    // Create new active config
    const tersierResult = await prisma.config.create({
      data: {
        scheme: 'tersier',
        json: tersierConfig,
        active: true
      }
    });
    console.log(`✅ Tersier config created: ID ${tersierResult.id}`);
    
    // Verify configurations
    const configs = await prisma.config.findMany({
      where: { active: true },
      select: { id: true, scheme: true, active: true, createdAt: true }
    });
    
    console.log('📊 Active configurations:', configs);
    console.log('🎉 Configuration seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding configurations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedConfigs().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedConfigs };

import { prisma } from '../lib/prisma.js';

async function createDummyUser() {
  console.log('🧑‍💼 Creating dummy user for testing...');
  
  try {
    // Create dummy user
    const user = await prisma.user.upsert({
      where: { email: 'system@test.com' },
      update: {},
      create: {
        id: 'system',
        email: 'system@test.com',
        name: 'System User',
        role: 'SURVEYOR',
        org: 'Test Organization'
      }
    });
    
    console.log('✅ Dummy user created:', user);
    return user;
    
  } catch (error) {
    console.error('❌ Error creating dummy user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDummyUser().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { createDummyUser };

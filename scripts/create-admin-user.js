const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('superadmin123', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'superadmin@sintara.id',
        password: hashedPassword,
        name: 'Administrator Sistem',
        role: 'SUPERADMIN',
        org: 'Dinas Pengairan'
      }
    });

    console.log('✅ Admin user created successfully:');
    console.log('📧 Email: admin@sipil-irigasi.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Name:', adminUser.name);
    console.log('🏢 Organization:', adminUser.org);
    console.log('');
    console.log('⚠️  PENTING: Ganti password default setelah login pertama!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upgradeToSuperAdmin() {
  try {
    // Find existing admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@sipil-irigasi.com'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found. Creating SUPERADMIN user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('superadmin123', 12);

      const superAdmin = await prisma.user.create({
        data: {
          email: 'superadmin@sipil-irigasi.com',
          password: hashedPassword,
          name: 'Super Administrator',
          role: 'SUPERADMIN',
          org: 'Sistem Pusat'
        }
      });

      console.log('✅ SUPERADMIN user created successfully:');
      console.log('📧 Email: superadmin@sipil-irigasi.com');
      console.log('🔑 Password: superadmin123');
      console.log('👤 Name:', superAdmin.name);
      console.log('🏢 Organization:', superAdmin.org);
      console.log('👑 Role: SUPERADMIN');

    } else {
      // Upgrade existing admin to SUPERADMIN
      const updatedUser = await prisma.user.update({
        where: {
          id: adminUser.id
        },
        data: {
          role: 'SUPERADMIN',
          name: 'Super Administrator',
          org: 'Sistem Pusat'
        }
      });

      console.log('✅ User upgraded to SUPERADMIN successfully:');
      console.log('📧 Email:', updatedUser.email);
      console.log('👤 Name:', updatedUser.name);
      console.log('🏢 Organization:', updatedUser.org);
      console.log('👑 Role: SUPERADMIN');
      console.log('🔑 Password: admin123 (unchanged)');
    }

    // Create sample ADMIN user
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@sipil-irigasi.com',
          password: hashedPassword,
          name: 'Administrator',
          role: 'ADMIN',
          org: 'Dinas Pengairan'
        }
      });

      console.log('');
      console.log('✅ ADMIN user created:');
      console.log('📧 Email: admin@sipil-irigasi.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Name:', adminUser.name);
      console.log('🏢 Organization:', adminUser.org);
      console.log('⚡ Role: ADMIN');
    }

    console.log('');
    console.log('🎯 Role Hierarchy:');
    console.log('👑 SUPERADMIN - Akses penuh semua fitur + role management');
    console.log('⚡ ADMIN - Kelola user & sistem (tidak bisa ubah SUPERADMIN)');
    console.log('📊 SURVEYOR - Buat & edit survey data');
    console.log('👁️  VIEWER - Lihat data saja');

  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

upgradeToSuperAdmin();

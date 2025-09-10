const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Sample data untuk daerah irigasi
  const sampleData = [
    {
      nama: "D.I. Way Rarem",
      kecamatan: "Seputih Surabaya",
      desa: "Sidomukti",
      luasLahan: 1250.5,
      jenisIrigasi: "Teknis",
      kondisi: "Baik",
      tahunBangun: 1985,
      latitude: -4.749309,
      longitude: 104.985786
    },
    {
      nama: "D.I. Bumi Restu",
      kecamatan: "Seputih Surabaya", 
      desa: "Bumi Restu",
      luasLahan: 850.3,
      jenisIrigasi: "Semi Teknis",
      kondisi: "Sedang",
      tahunBangun: 1990,
      latitude: -4.796160,
      longitude: 104.998429
    },
    {
      nama: "D.I. Bangun Sari",
      kecamatan: "Seputih Surabaya",
      desa: "Bangun Sari", 
      luasLahan: 675.8,
      jenisIrigasi: "Sederhana",
      kondisi: "Baik",
      tahunBangun: 1995,
      latitude: -4.697551,
      longitude: 105.027990
    },
    {
      nama: "D.I. Tata Karya",
      kecamatan: "Seputih Surabaya",
      desa: "Tata Karya",
      luasLahan: 920.2,
      jenisIrigasi: "Teknis",
      kondisi: "Rusak Ringan", 
      tahunBangun: 1988,
      latitude: -4.686101,
      longitude: 105.046862
    },
    {
      nama: "D.I. Pasar Sidomukti",
      kecamatan: "Seputih Surabaya",
      desa: "Sidomukti",
      luasLahan: 430.7,
      jenisIrigasi: "Semi Teknis",
      kondisi: "Baik",
      tahunBangun: 2000,
      latitude: -4.772099,
      longitude: 104.998627
    }
  ]

  console.log('Mulai seeding database...')
  
  for (const data of sampleData) {
    await prisma.daerahIrigasi.create({
      data: data
    })
    console.log(`✓ Berhasil menambahkan: ${data.nama}`)
  }

  console.log('Seeding selesai!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const daerahIrigasi = await prisma.daerahIrigasi.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(daerahIrigasi)
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data irigasi' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const daerahIrigasi = await prisma.daerahIrigasi.create({
      data: {
        nama: data.nama,
        kecamatan: data.kecamatan,
        desa: data.desa,
        luasLahan: parseFloat(data.luasLahan),
        jenisIrigasi: data.jenisIrigasi,
        kondisi: data.kondisi,
        tahunBangun: data.tahunBangun ? parseInt(data.tahunBangun) : null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
      }
    })
    return NextResponse.json(daerahIrigasi, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal membuat data irigasi' },
      { status: 500 }
    )
  }
}

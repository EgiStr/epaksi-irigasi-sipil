import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { hasPermission, PERMISSIONS, canManageUser } from '../../../../lib/permissions'
import { AuditLogger, getRequestInfo } from '../../../../lib/audit'

const prisma = new PrismaClient()

// GET /api/users/[id] - Ambil user berdasarkan ID
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.USER_VIEW)) {
      return NextResponse.json(
        { message: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data pengguna.' },
        { status: 403 }
      )
    }

    const { id } = params
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        org: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat mengambil data pengguna' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Akses ditolak. Hanya admin yang dapat mengubah data pengguna.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { email, password, name, role, org, status } = body

    // Check apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // Validasi email jika diubah
    if (email && email !== existingUser.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { message: 'Format email tidak valid' },
          { status: 400 }
        )
      }

      // Check email conflict
      const emailConflict = await prisma.user.findUnique({
        where: { email }
      })

      if (emailConflict) {
        return NextResponse.json(
          { message: 'Email sudah digunakan oleh pengguna lain' },
          { status: 409 }
        )
      }
    }

    // Validasi password jika diubah
    if (password && password.length < 6) {
      return NextResponse.json(
        { message: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Validasi role
    if (role) {
      const validRoles = ['ADMIN', 'SURVEYOR', 'VIEWER']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { message: 'Role tidak valid' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData = {}
    
    if (email) updateData.email = email
    if (name !== undefined) updateData.name = name || null
    if (role) updateData.role = role
    if (org !== undefined) updateData.org = org || null
    if (status) updateData.status = status
    
    // Hash password jika diubah
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        org: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat mengubah data pengguna' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Hapus user
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Akses ditolak. Hanya admin yang dapat menghapus pengguna.' },
        { status: 403 }
      )
    }

    const { id } = params

    // Cegah admin menghapus dirinya sendiri
    if (id === session.user.id) {
      return NextResponse.json(
        { message: 'Anda tidak dapat menghapus akun Anda sendiri' },
        { status: 400 }
      )
    }

    // Check apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Pengguna tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check apakah user memiliki survey yang terkait
    const userSurveys = await prisma.survey.count({
      where: { createdBy: id }
    })

    if (userSurveys > 0) {
      return NextResponse.json(
        { 
          message: `Tidak dapat menghapus pengguna. Terdapat ${userSurveys} survey yang dibuat oleh pengguna ini. Hapus atau transfer survey terlebih dahulu.`
        },
        { status: 400 }
      )
    }

    // Hapus user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Pengguna berhasil dihapus' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat menghapus pengguna' },
      { status: 500 }
    )
  }
}

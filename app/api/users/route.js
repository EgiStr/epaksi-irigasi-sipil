import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { hasPermission, PERMISSIONS, canManageUser } from '../../../lib/permissions'
import { AuditLogger, getRequestInfo } from '../../../lib/audit'

const prisma = new PrismaClient()

// GET /api/users - Ambil semua users dengan pagination dan filtering
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.USER_VIEW)) {
      return NextResponse.json(
        { message: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data pengguna.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    // Build where conditions
    const where = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { org: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role && role !== 'all') {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        org: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const total = await prisma.user.count({ where })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat mengambil data pengguna' },
      { status: 500 }
    )
  }
}

// POST /api/users - Buat user baru (admin+ only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    const { ipAddress, userAgent } = getRequestInfo(request)
    
    if (!session || !hasPermission(session.user.role, PERMISSIONS.USER_CREATE)) {
      return NextResponse.json(
        { message: 'Akses ditolak. Anda tidak memiliki izin untuk membuat pengguna baru.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, name, role, org } = body

    // Validasi input required
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email dan password wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    // Validasi password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Validasi role dan hierarchy
    const validRoles = ['SUPERADMIN', 'ADMIN', 'SURVEYOR', 'VIEWER']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { message: 'Role tidak valid' },
        { status: 400 }
      )
    }

    // Check if current user can assign this role
    if (role && !canManageUser(session.user.role, role)) {
      return NextResponse.json(
        { message: 'Anda tidak memiliki izin untuk memberikan role ini' },
        { status: 403 }
      )
    }

    // Check apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email sudah terdaftar' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: role || 'VIEWER',
        org: org || null,
        status: 'ACTIVE'
      },
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

    // Log audit trail
    await AuditLogger.logUserCreate(session.user.id, newUser, ipAddress, userAgent)

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat membuat pengguna baru' },
      { status: 500 }
    )
  }
}

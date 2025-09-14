'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Users, 
  Edit, 
  Trash2, 
  Search, 
  UserPlus,
  Shield,
  Mail,
  Calendar,
  Building,
  Crown,
  AlertTriangle
} from 'lucide-react'
import { getAssignableRoles, canManageUser, ROLE_DESCRIPTIONS, hasPermission, PERMISSIONS } from '../lib/permissions'

export default function UserManagement() {
  const { data: session } = useSession()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'VIEWER',
    org: '',
    password: ''
  })

  // Check permissions
  const canViewUsers = hasPermission(session?.user?.role, PERMISSIONS.USER_VIEW)
  const canCreateUsers = hasPermission(session?.user?.role, PERMISSIONS.USER_CREATE)
  const canEditUsers = hasPermission(session?.user?.role, PERMISSIONS.USER_EDIT)
  const canDeleteUsers = hasPermission(session?.user?.role, PERMISSIONS.USER_DELETE)
  const canAssignRoles = hasPermission(session?.user?.role, PERMISSIONS.USER_ROLE_ASSIGN)

  // Get assignable roles for current user
  const assignableRoles = getAssignableRoles(session?.user?.role || 'VIEWER')

  // Fetch users dari API
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const userData = await response.json()
        setUsers(userData)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter users berdasarkan search dan role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.org?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchUsers()
        resetForm()
        setShowAddModal(false)
        setEditingUser(null)
      } else {
        const error = await response.json()
        alert(error.message || 'Terjadi kesalahan')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('Terjadi kesalahan saat menyimpan user')
    }
  }

  const handleEdit = (user) => {
    // Check if current user can manage this user
    if (!canManageUser(session?.user?.role, user.role)) {
      alert('Anda tidak memiliki izin untuk mengedit pengguna dengan role ini')
      return
    }

    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name || '',
      role: user.role,
      org: user.org || '',
      password: '' // Don't prefill password for security
    })
    setShowAddModal(true)
  }

  const handleDelete = async (userId, userRole) => {
    // Check if current user can manage this user
    if (!canManageUser(session?.user?.role, userRole)) {
      alert('Anda tidak memiliki izin untuk menghapus pengguna dengan role ini')
      return
    }

    if (!confirm('Anda yakin ingin menghapus user ini?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        alert(error.message || 'Gagal menghapus user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Terjadi kesalahan saat menghapus user')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: assignableRoles.length > 0 ? assignableRoles[0] : 'VIEWER',
      org: '',
      password: ''
    })
  }

  const getRoleBadgeColor = (role) => {
    const roleInfo = ROLE_DESCRIPTIONS[role]
    switch (roleInfo?.color) {
      case 'red': return 'bg-red-100 text-red-800 border border-red-200'
      case 'blue': return 'bg-blue-100 text-blue-800 border border-blue-200'
      case 'green': return 'bg-green-100 text-green-800 border border-green-200'
      case 'gray': return 'bg-gray-100 text-gray-800 border border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'SUPERADMIN': return <Crown className="h-3 w-3" />
      case 'ADMIN': return <Shield className="h-3 w-3" />
      default: return <Shield className="h-3 w-3" />
    }
  }

  // Permission checks for UI rendering
  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Akses Ditolak</h3>
          <p className="text-gray-600">Anda tidak memiliki izin untuk melihat data pengguna.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="mr-3 h-8 w-8 text-blue-600" />
              Manajemen Pengguna
            </h1>
            <p className="text-gray-600 mt-2">
              Kelola akun pengguna dan hak akses sistem
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                if (!canCreateUsers) {
                  alert('Anda tidak memiliki izin untuk membuat pengguna baru')
                  return
                }
                resetForm()
                setEditingUser(null)
                setShowAddModal(true)
              }}
              disabled={!canCreateUsers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Tambah Pengguna
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, email, atau organisasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Semua Role</option>
              <option value="SUPERADMIN">Super Administrator</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terdaftar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'Nama belum diatur'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="mr-1 h-4 w-4" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{ROLE_DESCRIPTIONS[user.role]?.name || user.role}</span>
                      {user.role === 'SUPERADMIN' && (
                        <Crown className="ml-1 h-3 w-3 text-yellow-600" />
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Building className="mr-1 h-4 w-4 text-gray-400" />
                      {user.org || 'Tidak ada'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {canEditUsers && canManageUser(session?.user?.role, user.role) && (
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit pengguna"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canDeleteUsers && 
                       user.id !== session?.user?.id && 
                       canManageUser(session?.user?.role, user.role) && (
                        <button
                          onClick={() => handleDelete(user.id, user.role)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Hapus pengguna"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {!canManageUser(session?.user?.role, user.role) && (
                        <span className="text-gray-400 text-xs">
                          Akses terbatas
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada pengguna ditemukan</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'ALL' 
                ? 'Coba ubah filter pencarian Anda'
                : 'Mulai dengan menambahkan pengguna baru'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nama lengkap pengguna"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {assignableRoles.map(role => (
                    <option key={role} value={role}>
                      {ROLE_DESCRIPTIONS[role]?.name || role}
                      {role === 'SUPERADMIN' && ' 👑'}
                    </option>
                  ))}
                </select>
                {assignableRoles.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Anda tidak memiliki izin untuk mengatur role pengguna
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {ROLE_DESCRIPTIONS[formData.role]?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organisasi
                </label>
                <input
                  type="text"
                  value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dinas Pengairan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingUser ? '(kosongkan jika tidak ingin mengubah)' : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={editingUser ? "Masukkan password baru" : "Minimal 6 karakter"}
                  minLength="6"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingUser(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingUser ? 'Update' : 'Tambah'} Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

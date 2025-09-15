'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  Users,
  Activity
} from 'lucide-react'
import { hasPermission, PERMISSIONS, ROLE_HIERARCHY } from '../../lib/permissions'

const UserManagement = () => {
  const { data: session } = useSession()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [currentPage, filterRole, filterStatus])

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        fetchUsers()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50', // Get more users for better filtering
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (filterRole !== 'all') params.append('role', filterRole)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      
      const response = await fetch(`/api/users?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
      
    } catch (err) {
      setError(`Error mengambil data pengguna: ${err.message}`)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (userData) => {
    try {
      const response = await fetch('/api/users', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal membuat pengguna')
      }
      
      const newUser = await response.json()
      setUsers(prev => [newUser, ...prev])
      setIsCreateModalOpen(false)
      alert('Pengguna berhasil dibuat')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEditUser = async (userId, userData) => {
    try {
      const response = await fetch(`/api/users/${userId}`, { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal memperbarui pengguna')
      }
      
      const updatedUser = await response.json()
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      ))
      setIsEditModalOpen(false)
      alert('Pengguna berhasil diperbarui')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, { 
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal menghapus pengguna')
      }
      
      setUsers(prev => prev.filter(user => user.id !== userId))
      alert('Pengguna berhasil dihapus')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      const response = await fetch(`/api/users/${userId}`, { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Gagal mengubah status pengguna')
      }
      
      const updatedUser = await response.json()
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updatedUser } : user
      ))
      alert(`Status pengguna berhasil ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // Ensure users is always an array before filtering
  const safeUsers = Array.isArray(users) ? users : []
  
  const filteredUsers = safeUsers.filter(user => {
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.org || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const roles = Object.keys(ROLE_HIERARCHY)
  const statuses = ['ACTIVE', 'INACTIVE']

  const getRoleColor = (role) => {
    switch (role) {
      case 'SUPERADMIN': return 'bg-red-100 text-red-800'
      case 'ADMIN': return 'bg-blue-100 text-blue-800'
      case 'SURVEYOR': return 'bg-green-100 text-green-800'
      case 'VIEWER': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    return status === 'ACTIVE' 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  const canEditUser = (targetUser) => {
    if (!session?.user?.role) return false
    return hasPermission(session.user.role, PERMISSIONS.USER_EDIT) &&
           ROLE_HIERARCHY[session.user.role] >= ROLE_HIERARCHY[targetUser.role]
  }

  const canDeleteUser = (targetUser) => {
    if (!session?.user?.role) return false
    return hasPermission(session.user.role, PERMISSIONS.USER_DELETE) &&
           ROLE_HIERARCHY[session.user.role] > ROLE_HIERARCHY[targetUser.role]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari pengguna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Role</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Semua Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {hasPermission(session?.user?.role, PERMISSIONS.USER_CREATE) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pengguna</p>
              <p className="text-xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pengguna Aktif</p>
              <p className="text-xl font-semibold text-gray-900">
                {safeUsers.filter(u => u.status === 'ACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pengguna Nonaktif</p>
              <p className="text-xl font-semibold text-gray-900">
                {safeUsers.filter(u => u.status === 'INACTIVE').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Login Hari Ini</p>
              <p className="text-xl font-semibold text-gray-900">
                {safeUsers.filter(u => {
                  const lastLogin = new Date(u.lastLogin)
                  const today = new Date()
                  return lastLogin.toDateString() === today.toDateString()
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organisasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                      ? 'Tidak ada pengguna yang sesuai filter' 
                      : 'Belum ada pengguna'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.lastLogin).toLocaleString('id-ID')}
                        </div>
                      ) : (
                        <span className="text-gray-400">Belum pernah login</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.org || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDetailModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canEditUser(user) && (
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setIsEditModalOpen(true)
                            }}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                            title="Edit pengguna"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {hasPermission(session?.user?.role, PERMISSIONS.USER_EDIT) && (
                          <button
                            onClick={() => handleToggleStatus(user.id, user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`p-1 rounded transition-colors ${
                              user.status === 'ACTIVE' 
                                ? 'text-red-600 hover:text-red-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {user.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                        
                        {canDeleteUser(user) && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="Hapus pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <UserFormModal
          title="Tambah Pengguna Baru"
          onSave={handleCreateUser}
          onClose={() => setIsCreateModalOpen(false)}
          currentUserRole={session?.user?.role}
        />
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <UserFormModal
          title="Edit Pengguna"
          user={selectedUser}
          onSave={(userData) => handleEditUser(selectedUser.id, userData)}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedUser(null)
          }}
          currentUserRole={session?.user?.role}
        />
      )}

      {/* User Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

// User Form Modal Component
const UserFormModal = ({ title, user, onSave, onClose, currentUserRole }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '', // Add password field
    role: user?.role || 'VIEWER',
    org: user?.org || '' // Change from department to org to match API
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.role) {
      alert('Mohon lengkapi semua field yang wajib diisi')
      return
    }
    
    // For new users, password is required
    if (!user && !formData.password) {
      alert('Password wajib diisi untuk pengguna baru')
      return
    }
    
    // Validate password length for new users
    if (!user && formData.password && formData.password.length < 6) {
      alert('Password minimal 6 karakter')
      return
    }
    
    // Prepare data for API
    const submitData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      org: formData.org || null
    }
    
    // Only include password for new users or when password is provided
    if (!user || formData.password) {
      submitData.password = formData.password
    }
    
    onSave(submitData)
  }

  const availableRoles = Object.keys(ROLE_HIERARCHY).filter(role => 
    ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[role] || 
    (currentUserRole === 'SUPERADMIN' && role === 'SUPERADMIN')
  )

  return (
    <div className="user-modal-overlay fixed inset-0" style={{ zIndex: 1001 }}>
      <div className="user-modal-content fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col" style={{ 
        zIndex: 1002,
        maxWidth: '600px', 
        width: 'calc(100% - 2rem)',
        left: '50%',
        top: '50%',
        transform: 'translateX(-50%) translateY(-50%)'
      }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {!user && '*'} {user && '(Kosongkan jika tidak ingin mengubah)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={user ? "Masukkan password baru..." : "Minimal 6 karakter"}
              required={!user} // Required only for new users
              minLength={6}
            />
            {formData.password && formData.password.length < 6 && (
              <p className="text-red-500 text-xs mt-1">Password minimal 6 karakter</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organisasi
            </label>
            <input
              type="text"
              value={formData.org}
              onChange={(e) => setFormData(prev => ({ ...prev, org: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Dinas Pengairan, Kementerian PUPR"
            />
          </div>
        </form>
        </div>
        
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-2 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            {user ? 'Update' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// User Detail Modal Component
const UserDetailModal = ({ user, onClose }) => {
  return (
    <div className="user-modal-overlay fixed inset-0" style={{ zIndex: 1001 }}>
      <div className="user-modal-content fixed bg-white rounded-3xl shadow-2xl max-h-[80vh] flex flex-col" style={{ 
        zIndex: 1002,
        maxWidth: '800px', 
        width: 'calc(100% - 2rem)',
        left: '50%',
        top: '50%',
        transform: 'translateX(-50%) translateY(-50%)'
      }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
          <h3 className="text-lg font-semibold text-gray-900">Detail Pengguna</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-all duration-200 bg-white bg-opacity-50"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Profile Section */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-xl">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{user.name}</h4>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800' :
                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                  user.role === 'SURVEYOR' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Shield className="w-3 h-3" />
                  {user.role}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Informasi Kontak</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-gray-400">📞</span>
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-gray-400">🏢</span>
                  <span>{user.org || 'Tidak ada organisasi'}</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-2">Aktivitas</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    <strong>Bergabung:</strong> {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span>
                    <strong>Login Terakhir:</strong> {
                      user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleString('id-ID')
                        : 'Belum pernah login'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Section */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Hak Akses</h5>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">
                Role <strong>{user.role}</strong> memiliki akses untuk:
                {/* You can expand this to show actual permissions */}
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {user.role === 'SUPERADMIN' && (
                    <>
                      <li>Semua fitur sistem</li>
                      <li>Manajemen pengguna dan role</li>
                      <li>Konfigurasi sistem</li>
                    </>
                  )}
                  {user.role === 'ADMIN' && (
                    <>
                      <li>Manajemen data survey dan fitur</li>
                      <li>Manajemen pengguna (terbatas)</li>
                      <li>Laporan dan analytics</li>
                    </>
                  )}
                  {user.role === 'SURVEYOR' && (
                    <>
                      <li>Input dan edit data survey</li>
                      <li>View data fitur irigasi</li>
                      <li>Export laporan</li>
                    </>
                  )}
                  {user.role === 'VIEWER' && (
                    <>
                      <li>View data dashboard</li>
                      <li>View data fitur irigasi</li>
                      <li>View laporan (terbatas)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-2 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserManagement

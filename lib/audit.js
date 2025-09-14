import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Audit Logger untuk tracking semua user actions
 */
export class AuditLogger {
  /**
   * Log user action to audit trail
   */
  static async log({
    userId,
    action,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    metadata = null,
    ipAddress = null,
    userAgent = null
  }) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      console.log(`[AUDIT] ${action} by ${auditLog.user.email} on ${entityType}:${entityId}`)
      return auditLog
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw error to prevent breaking main functionality
      return null
    }
  }

  /**
   * Log user login
   */
  static async logLogin(userId, ipAddress, userAgent, success = true) {
    return this.log({
      userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: { success }
    })
  }

  /**
   * Log user logout
   */
  static async logLogout(userId, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log user creation
   */
  static async logUserCreate(createdByUserId, newUser, ipAddress, userAgent) {
    return this.log({
      userId: createdByUserId,
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: newUser.id,
      newValues: {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        org: newUser.org
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log user update
   */
  static async logUserUpdate(updatedByUserId, userId, oldValues, newValues, ipAddress, userAgent) {
    return this.log({
      userId: updatedByUserId,
      action: 'USER_UPDATE',
      entityType: 'USER',
      entityId: userId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log user deletion
   */
  static async logUserDelete(deletedByUserId, deletedUser, ipAddress, userAgent) {
    return this.log({
      userId: deletedByUserId,
      action: 'USER_DELETE',
      entityType: 'USER',
      entityId: deletedUser.id,
      oldValues: {
        email: deletedUser.email,
        name: deletedUser.name,
        role: deletedUser.role,
        org: deletedUser.org
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log role change
   */
  static async logRoleChange(changedByUserId, userId, oldRole, newRole, ipAddress, userAgent) {
    return this.log({
      userId: changedByUserId,
      action: 'ROLE_CHANGE',
      entityType: 'USER',
      entityId: userId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      metadata: { critical: true },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log survey actions
   */
  static async logSurveyAction(userId, action, surveyId, oldValues = null, newValues = null, ipAddress, userAgent) {
    const actionMap = {
      'create': 'SURVEY_CREATE',
      'update': 'SURVEY_UPDATE',
      'delete': 'SURVEY_DELETE',
      'view': 'SURVEY_VIEW'
    }

    return this.log({
      userId,
      action: actionMap[action] || action.toUpperCase(),
      entityType: 'SURVEY',
      entityId: surveyId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    })
  }

  /**
   * Log feature/data upload
   */
  static async logDataUpload(userId, fileName, featuresCount, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'DATA_UPLOAD',
      entityType: 'FEATURE',
      metadata: {
        fileName,
        featuresCount,
        uploadedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent
    })
  }

  /**
   * Log system configuration changes
   */
  static async logSystemConfig(userId, configType, oldConfig, newConfig, ipAddress, userAgent) {
    return this.log({
      userId,
      action: 'SYSTEM_CONFIG_CHANGE',
      entityType: 'SYSTEM',
      entityId: configType,
      oldValues: oldConfig,
      newValues: newConfig,
      metadata: { critical: true },
      ipAddress,
      userAgent
    })
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getLogs({
    userId = null,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
  } = {}) {
    const where = {}
    
    if (userId) where.userId = userId
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  }

  /**
   * Get user activity summary
   */
  static async getUserActivity(userId, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })
  }

  /**
   * Get security alerts (critical actions)
   */
  static async getSecurityAlerts(hours = 24) {
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    return prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        OR: [
          { action: 'ROLE_CHANGE' },
          { action: 'USER_DELETE' },
          { action: 'SYSTEM_CONFIG_CHANGE' },
          { action: 'LOGIN_FAILED' }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
}

/**
 * Middleware helper to extract request info
 */
export function getRequestInfo(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipAddress = forwarded ? forwarded.split(',')[0] : 
                   request.headers.get('x-real-ip') || 
                   'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}

import { Router, Response } from 'express'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// Get dashboard metrics
router.get(
  '/metrics',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const [
      totalContent,
      weeklyContent,
      contentByType,
      totalApiCalls,
      apiByService,
      newsletters,
      recentApiUsage,
    ] = await Promise.all([
      // Total content
      prisma.content.count({
        where: { userId: req.user!.id },
      }),

      // Weekly content
      prisma.content.count({
        where: {
          userId: req.user!.id,
          createdAt: { gte: startOfWeek },
        },
      }),

      // Content by type
      prisma.content.groupBy({
        by: ['type'],
        where: { userId: req.user!.id },
        _count: { id: true },
      }),

      // Total API calls
      prisma.apiUsage.count({
        where: { userId: req.user!.id },
      }),

      // API calls by service
      prisma.apiUsage.groupBy({
        by: ['service'],
        where: { userId: req.user!.id },
        _count: { id: true },
        _sum: { tokens: true },
      }),

      // Newsletter stats
      prisma.newsletter.aggregate({
        where: { userId: req.user!.id },
        _count: { id: true },
        _sum: { opens: true, clicks: true, subscribers: true },
      }),

      // Recent API usage for latency calculation
      prisma.apiUsage.findMany({
        where: {
          userId: req.user!.id,
          createdAt: { gte: startOfWeek },
        },
        select: { latency: true, status: true },
      }),
    ])

    // Calculate average latency and error rate
    const avgLatency = recentApiUsage.length > 0
      ? recentApiUsage.reduce((sum, u) => sum + u.latency, 0) / recentApiUsage.length
      : 0

    const errorRate = recentApiUsage.length > 0
      ? (recentApiUsage.filter(u => u.status !== 'success').length / recentApiUsage.length) * 100
      : 0

    res.json({
      success: true,
      data: {
        content: {
          total: totalContent,
          thisWeek: weeklyContent,
          byType: Object.fromEntries(
            contentByType.map((c) => [c.type.toLowerCase(), c._count.id])
          ),
        },
        api: {
          totalCalls: totalApiCalls,
          avgLatency: Math.round(avgLatency),
          errorRate: Math.round(errorRate * 100) / 100,
          byService: Object.fromEntries(
            apiByService.map((s) => [s.service, {
              calls: s._count.id,
              tokens: s._sum.tokens || 0,
            }])
          ),
        },
        newsletter: {
          total: newsletters._count.id,
          totalOpens: newsletters._sum.opens || 0,
          totalClicks: newsletters._sum.clicks || 0,
          avgOpenRate: newsletters._sum.subscribers
            ? ((newsletters._sum.opens || 0) / newsletters._sum.subscribers) * 100
            : 0,
        },
      },
    })
  })
)

// Get usage over time
router.get(
  '/usage',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { period = '7d' } = req.query

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const usage = await prisma.apiUsage.findMany({
      where: {
        userId: req.user!.id,
        createdAt: { gte: startDate },
      },
      select: {
        service: true,
        tokens: true,
        cost: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by day
    const dailyUsage: Record<string, { tokens: number; cost: number; calls: number }> = {}

    usage.forEach((u) => {
      const date = u.createdAt.toISOString().split('T')[0]
      if (!dailyUsage[date]) {
        dailyUsage[date] = { tokens: 0, cost: 0, calls: 0 }
      }
      dailyUsage[date].tokens += u.tokens
      dailyUsage[date].cost += u.cost
      dailyUsage[date].calls += 1
    })

    res.json({
      success: true,
      data: {
        period,
        daily: Object.entries(dailyUsage).map(([date, data]) => ({
          date,
          ...data,
        })),
        total: {
          tokens: usage.reduce((sum, u) => sum + u.tokens, 0),
          cost: usage.reduce((sum, u) => sum + u.cost, 0),
          calls: usage.length,
        },
      },
    })
  })
)

// Get content analytics
router.get(
  '/content',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { period = '7d' } = req.query

    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [statusBreakdown, typeBreakdown, recentContent] = await Promise.all([
      prisma.content.groupBy({
        by: ['status'],
        where: {
          userId: req.user!.id,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),

      prisma.content.groupBy({
        by: ['type'],
        where: {
          userId: req.user!.id,
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        _sum: { tokensSaved: true, duration: true },
      }),

      prisma.content.findMany({
        where: {
          userId: req.user!.id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          tokensSaved: true,
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        period,
        byStatus: Object.fromEntries(
          statusBreakdown.map((s) => [s.status.toLowerCase(), s._count.id])
        ),
        byType: typeBreakdown.map((t) => ({
          type: t.type.toLowerCase(),
          count: t._count.id,
          tokensSaved: t._sum.tokensSaved || 0,
          totalDuration: t._sum.duration || 0,
        })),
        recent: recentContent,
      },
    })
  })
)

// Admin: Get system metrics
router.get(
  '/system',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      usersByTier,
      totalContent,
      apiEndpoints,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          lastLogin: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),

      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),

      prisma.user.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),

      prisma.content.count(),

      prisma.apiEndpoint.findMany({
        orderBy: { hits: 'desc' },
        take: 10,
      }),
    ])

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday,
          byTier: Object.fromEntries(
            usersByTier.map((t) => [t.tier.toLowerCase(), t._count.id])
          ),
        },
        content: {
          total: totalContent,
        },
        endpoints: apiEndpoints.map((e) => ({
          method: e.method,
          path: e.path,
          hits: e.hits,
          avgLatency: e.avgLatency,
          status: e.status,
        })),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      },
    })
  })
)

// Get API endpoint stats
router.get(
  '/endpoints',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const endpoints = await prisma.apiEndpoint.findMany({
      orderBy: [
        { status: 'asc' },
        { hits: 'desc' },
      ],
    })

    res.json({
      success: true,
      data: endpoints,
    })
  })
)

export default router

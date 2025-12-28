import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../../lib/db/prisma'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { authRateLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../middleware/errorHandler'
import type { JWTPayload } from '../../types'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret'
const JWT_EXPIRES_IN = '15m'
const JWT_REFRESH_EXPIRES_IN = '7d'

function generateTokens(user: { id: string; email: string; role: string; tier: string }) {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role as JWTPayload['role'],
    tier: user.tier.toLowerCase() as JWTPayload['tier'],
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  })

  return { accessToken, refreshToken }
}

// Register
router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        createdAt: true,
      },
    })

    const { accessToken, refreshToken } = generateTokens(user)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
      },
    })
  })
)

// Login
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, totpCode } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      })
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(200).json({
          success: true,
          data: {
            requires2FA: true,
          },
        })
      }

      const isValidTotp = authenticator.verify({
        token: totpCode,
        secret: user.twoFactorSecret || '',
      })

      if (!isValidTotp) {
        return res.status(401).json({
          success: false,
          error: 'Invalid 2FA code',
        })
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const { accessToken, refreshToken } = generateTokens(user)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
        },
        accessToken,
      },
    })
  })
)

// Refresh token
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token',
      })
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, tier: true },
      })

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        })
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user)

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      res.json({
        success: true,
        data: { accessToken },
      })
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      })
    }
  })
)

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken')
  res.json({
    success: true,
    message: 'Logged out successfully',
  })
})

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        tier: true,
        twoFactorEnabled: true,
        preferences: true,
        createdAt: true,
        lastLogin: true,
      },
    })

    res.json({
      success: true,
      data: user,
    })
  })
)

// Update profile
router.patch(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, preferences } = req.body

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(preferences && { preferences }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        tier: true,
        preferences: true,
      },
    })

    res.json({
      success: true,
      data: user,
    })
  })
)

// Change password
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    })

    if (!user?.password) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change password for OAuth users',
      })
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
    })

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  })
)

// Enable 2FA
router.post(
  '/2fa/enable',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    })

    if (user?.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled',
      })
    }

    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(req.user!.email, 'AI Content Studio', secret)
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    // Store secret temporarily (not enabled yet until verified)
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorSecret: secret },
    })

    res.json({
      success: true,
      data: {
        secret,
        qrCode,
      },
    })
  })
)

// Verify and activate 2FA
router.post(
  '/2fa/verify',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    })

    if (!user?.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: 'Please set up 2FA first',
      })
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    })

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid verification code',
      })
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { twoFactorEnabled: true },
    })

    res.json({
      success: true,
      message: '2FA enabled successfully',
    })
  })
)

// Disable 2FA
router.post(
  '/2fa/disable',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    })

    if (!user?.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled',
      })
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret || '',
    })

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid verification code',
      })
    }

    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    })

    res.json({
      success: true,
      message: '2FA disabled successfully',
    })
  })
)

export default router

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../middleware/errorHandler.js'

const prisma = new PrismaClient()

interface SignupData {
  username: string
  email: string
  password: string
}

interface LoginData {
  email: string
  password: string
}

export const authService = {
  async signup(data: SignupData) {
    const { username, email, password } = data

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 400)
      }
      throw new AppError('Username already taken', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
    })

    // Generate token
    const token = this.generateToken(user.id, user.email)

    // Create session
    await this.createSession(user.id, token)

    return { user, token }
  },

  async login(data: LoginData) {
    const { email, password } = data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate token
    const token = this.generateToken(user.id, user.email)

    // Create session
    await this.createSession(user.id, token)

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
      token,
    }
  },

  async logout(token: string) {
    await prisma.session.deleteMany({
      where: { token },
    })
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        isVerified: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError('User not found', 404)
    }

    return user
  },

  generateToken(userId: string, email: string): string {
    const jwtSecret = process.env.JWT_SECRET
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

    if (!jwtSecret) {
      throw new AppError('JWT secret not configured', 500)
    }

    return jwt.sign({ userId, email }, jwtSecret, {
      expiresIn,
    })
  },

  async createSession(userId: string, token: string) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    })
  },

  async cleanupExpiredSessions() {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
  },
}

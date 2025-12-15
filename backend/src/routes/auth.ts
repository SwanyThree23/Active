import { Router } from 'express'
import { z } from 'zod'
import { authService } from '../services/authService.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

// Validation schemas
const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const validatedData = signupSchema.parse(req.body)
    const result = await authService.signup(validatedData)

    res.status(201).json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body)
    const result = await authService.login(validatedData)

    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400))
    }
    next(error)
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (token) {
      await authService.logout(token)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401)
    }

    const user = await authService.getMe(req.user.id)
    res.json(user)
  } catch (error) {
    next(error)
  }
})

export default router

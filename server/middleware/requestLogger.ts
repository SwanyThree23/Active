import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const log = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${log.method} ${log.path} ${log.statusCode} - ${log.duration}`
      )
    } else {
      console.log(JSON.stringify(log))
    }
  })

  next()
}

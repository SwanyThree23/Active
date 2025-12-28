import { Router } from 'express';

const router = Router();

// Simple password-based auth
router.post('/login', (req, res) => {
  const { password } = req.body;
  const validPassword = process.env.AUTH_PASSWORD || 'swanypro2026';

  if (password === validPassword) {
    res.json({
      success: true,
      message: 'Authentication successful',
      token: Buffer.from(`${Date.now()}:${password}`).toString('base64')
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (token) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

export default router;

import { Router } from 'express';

const router: Router = Router();

// Retrieve currently logged in user (safe mock returning null)
router.get('/me', (req, res) => {
  res.status(200).json({
    success: true,
    data: null
  });
});

router.post('/login', (req, res) => {
  res.status(200).json({
    success: true,
    data: null,
    message: 'Login simulation successful'
  });
});

router.post('/register', (req, res) => {
  res.status(201).json({
    success: true,
    data: null,
    message: 'Registration simulation successful'
  });
});

router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;

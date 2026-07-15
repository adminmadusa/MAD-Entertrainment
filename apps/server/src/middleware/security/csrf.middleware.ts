import { Request, Response, NextFunction } from 'express';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Allow safe methods (though typically applied only to POST/PUT/DELETE anyway)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-xsrf-token'] || req.headers['x-csrf-token'];
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF validation failed.',
      },
    });
  }
  
  next();
};

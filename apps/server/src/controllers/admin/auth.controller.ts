import { Request, Response } from "express";
import { adminAuthService } from "../../services/admin/auth.service";

export const adminAuthController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await adminAuthService.login(email, password);

    res.json({
      success: true,
      data: result,
    });
  },

  async getMe(req: Request, res: Response) {
    // We assume an authentication middleware attaches `admin` to `req`
    const adminId = (req as any).admin.id;
    const result = await adminAuthService.getMe(adminId);

    res.json({
      success: true,
      data: result,
    });
  },

  async logout(_req: Request, res: Response) {
    // In a stateless JWT setup, logout can be handled client-side by dropping the token,
    // or by adding it to a blacklist in Redis if strict revocation is needed.
    // For now, we return success.
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  },
};

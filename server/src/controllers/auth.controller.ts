import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const sync = async (req: Request, res: Response) => {
  const user = await authService.syncUser(req.firebaseUser!, req.body.name);
   res.status(200).json({ success: true, data: { user } });
};

export const me = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: { user: req.user } });
};
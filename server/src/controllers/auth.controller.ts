
import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

export const sync = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const user = await authService.syncUser(req.firebaseUser!, req.body.name
    );
    res.status(200).json({success: true,user});
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request,res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true,user: req.user,});
  } catch (error) {
    next(error);
  }
};

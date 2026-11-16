
import { Request, Response, NextFunction } from "express";
import {authRepository} from "../repositories/auth.repository";

export const sync = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const user = await authRepository.syncUser(req.firebaseUser!, req.body.name);
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

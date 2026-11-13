import { DecodedIdToken } from "firebase-admin/auth";
import { HydratedDocument } from "mongoose";
import { IUser } from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      user?: HydratedDocument<IUser>;
    }
  }
}

export {};
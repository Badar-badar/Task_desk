import type { DecodedIdToken } from "firebase-admin/auth";
import type { HydratedDocument } from "mongoose";
import type { IUser } from "../models/user.model";
import type { IOrganization } from "../interfaces/iOrganization";

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
      user?: HydratedDocument<IUser>;
      organization?: HydratedDocument<IOrganization.Model>;
    }
  }
}

export {};
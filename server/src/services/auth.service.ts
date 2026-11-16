import { DecodedIdToken } from "firebase-admin/auth";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";

export const syncUser = async (decoded: DecodedIdToken, name?: string) => {
  if (!decoded.email) throw new ApiError(400, "Firebase account has no email");

  const displayName = name?.trim() || decoded.name || decoded.email.split("@")[0];

  return User.findOneAndUpdate(
    { firebaseUid: decoded.uid },
    {
      $setOnInsert: { firebaseUid: decoded.uid, email: decoded.email, name: displayName },
      $set: { lastLogin: new Date() },
    },
    { upsert: true, new: true, runValidators: true }
  );
};
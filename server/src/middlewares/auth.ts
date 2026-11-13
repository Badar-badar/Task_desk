import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { firebaseAuth } from "../config/firebase.js";
import { User } from "../models/user.model.js";

export const verifyToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid Authorization header");
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw new ApiError(401, "Missing token");
  }

  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  next();
});


export const loadUser = asyncHandler(async (req, _res, next) => {
  const user = await User.findOne({ firebaseUid: req.firebaseUser!.uid });

  if (!user) {
    throw new ApiError(401, "User not registered. Call /api/auth/sync first");
  }
  if (!user.isActive) {
    throw new ApiError(403, "User is deactivated. Please request activation");
  }

  req.user = user;
  next();
});


export const authenticate = [verifyToken, loadUser];
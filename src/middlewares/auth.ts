import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler.js";
import { firebaseAuth } from "../config/firebase.js";
import { prisma } from "../config/db.js";
import { authRepository } from "../repositories/auth.repository";

export const verifyToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "API_ERROR", "Missing or invalid Authorization header");
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw new AppError(401, "API_ERROR", "Missing token");
  }

  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
  } catch {
    throw new AppError(401, "API_ERROR", "Invalid or expired token");
  }

  next();
});


export const loadUser = asyncHandler(async (req, _res, next) => {
  let user = await prisma.user.findUnique({
    where: { firebaseUid: req.firebaseUser!.uid },
  });

  if (!user) {
    // Firebase verification succeeded, so safely create the corresponding local user.
    // This also prevents a first-request race with the frontend's explicit /auth/sync call.
    user = await authRepository.syncUser(req.firebaseUser!);
  }
  if (!user.isActive) {
    throw new AppError(403, "API_ERROR", "User is deactivated. Please request activation");
  }

  req.user = user;
  next();
});


export const authenticate = [verifyToken, loadUser];

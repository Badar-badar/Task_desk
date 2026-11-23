import { DecodedIdToken } from "firebase-admin/auth";
import { User } from "../models/user.model";
import { AppError } from "../utils/appError";
import { invitationRepository } from "./invitation.repository";
import { ProjectModel } from "../models/project.model";
import { redisCacheService } from "../services/redisCache.service";

class AuthRepository{
public async syncUser(decoded: DecodedIdToken, name?: string){
  if (!decoded.email) throw new AppError(400, "API_ERROR", "Firebase account has no email");

  const displayName = name?.trim() || decoded.name || decoded.email.split("@")[0];

  const user = await User.findOneAndUpdate(
    { firebaseUid: decoded.uid },
    {
      $setOnInsert: { firebaseUid: decoded.uid, email: decoded.email, name: displayName },
      $set: { lastLogin: new Date() },
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  const projectIds = await invitationRepository.acceptAllForUser(user._id, user.email);
  if (projectIds.length) {
    const projects = await ProjectModel.find({ _id: { $in: projectIds } })
      .select("workspaceId")
      .lean();
    await Promise.all(
      [...new Set(projects.map((project) => project.workspaceId.toString()))]
        .map((workspaceId) => redisCacheService.invalidateWorkspaceLists(workspaceId)),
    );
  }
  return user;
};
}

export const authRepository = new AuthRepository();


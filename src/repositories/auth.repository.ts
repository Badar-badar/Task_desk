import { DecodedIdToken } from "firebase-admin/auth";
import {prisma} from '../config/db'
import { AppError } from "../utils/appError";
import { invitationRepository } from "./invitation.repository";
import { redisCacheService } from "../services/redisCache.service";

class AuthRepository{
public async syncUser(decoded: DecodedIdToken, name?: string){
  if (!decoded.email) throw new AppError(400, "API_ERROR", "Firebase account has no email");


  const email = decoded.email.trim().toLowerCase();
const displayName = name?.trim() || decoded.name || email.split("@")[0];

const user = await prisma.user.upsert({
  where: { firebaseUid: decoded.uid },
  create: { firebaseUid: decoded.uid, email, name: displayName, lastLogin: new Date() },
  update: { lastLogin: new Date() },
});

  const projectIds = await invitationRepository.acceptAllForUser(user.id, user.email);
  if (projectIds.length) {
    const projects = await prisma.project.findMany({
      where:{ id: { in: projectIds } },
      select:{workspaceId:true},
    });
    await Promise.all(
      [...new Set(projects.map((project) => project.workspaceId))]
        .map((workspaceId) => redisCacheService.invalidateWorkspaceLists(workspaceId)),
    );
  }
  return user;
};
}

export const authRepository = new AuthRepository();


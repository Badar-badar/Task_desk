import type { Types } from "mongoose";
import { FavoriteModel } from "../models/favourite";
import { ProjectModel } from "../models/project.model";
import { ProjectMemberModel } from "../models/projectMember.model";

class FavoriteRepository {
  // if starred -> unstar, otherwise star
  public async toggle(userId: Types.ObjectId, projectId: Types.ObjectId) {
    const deleted = await FavoriteModel.findOneAndDelete({ userId, projectId });
    if (deleted) return { isFavorite: false };

    await FavoriteModel.updateOne(
      { userId, projectId },
      { $setOnInsert: { userId, projectId } },
      { upsert: true },
    );
    return { isFavorite: true };
  }

  // my starred projects (only ones I'm still a member of)
  public async listProjects(userId: Types.ObjectId) {
    const favorites = await FavoriteModel.find({ userId }).sort({ createdAt: -1 }).lean();
    if (!favorites.length) return [];

    const ids = favorites.map((f) => f.projectId);
    const memberships = await ProjectMemberModel.find({ userId, projectId: { $in: ids } })
      .select("projectId")
      .lean();
    const allowed = new Set(memberships.map((m) => m.projectId.toString()));

    const projects = await ProjectModel.find({
      _id: { $in: ids.filter((id) => allowed.has(id.toString())) },
    })
      .select("_id name color status")
      .lean();
    const byId = new Map(projects.map((p) => [p._id.toString(), p]));

    // keep the order the user starred them in
    return ids.map((id) => byId.get(id.toString())).filter(Boolean);
  }

  // for GET /project: which of these projects are starred by the user
  public async getFavoriteIds(userId: Types.ObjectId, projectIds: Types.ObjectId[]) {
    const rows = await FavoriteModel.find({ userId, projectId: { $in: projectIds } })
      .select("projectId")
      .lean();
    return new Set(rows.map((r) => r.projectId.toString()));
  }
}

export const favoriteRepository = new FavoriteRepository();

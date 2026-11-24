import {prisma} from '../config/db'

class FavoriteRepository {
  // if starred -> unstar, otherwise star
  public async toggle(userId: string, projectId: string) {
    const deleted = await prisma.favorite.deleteMany({where:{ userId, projectId }});
    if (deleted.count > 0) return { isFavorite: false };

    await prisma.favorite.upsert(
      {
        where:{userId_projectId:{userId,projectId}},
        create:{userId,projectId},
        update:{},
      }

    );
    return { isFavorite: true };
  }

  // my starred projects (only ones I'm still a member of)
  public async listProjects(userId: string) {
    const favorites = await prisma.favorite.findMany({where:{userId },orderBy:{ createdAt: 'desc' }});
    if (!favorites.length) return [];

    const ids = favorites.map((f) => f.projectId);
    const memberships = await prisma.projectMember.findMany({
      where:{ userId,projectId:{in:ids}},
      select:{projectId:true},
    });


    const allowed = new Set(memberships.map((m) => m.projectId));

    const projects = await prisma.project.findMany({
      where: { id: { in: ids.filter((id) => allowed.has(id)) } },
      select: { id: true, name: true, color: true, status: true },
    });
    const byId = new Map(projects.map((p) => [p.id, p]));

    // keep the order the user starred them in
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  // for GET /project: which of these projects are starred by the user
  public async getFavoriteIds(userId: string, projectIds: string[]) {
    const rows = await prisma.favorite.findMany({where:{userId,projectId:{in:projectIds}},select:{projectId:true}})

    return new Set(rows.map((r) => r.projectId));
  }
}

export const favoriteRepository = new FavoriteRepository();

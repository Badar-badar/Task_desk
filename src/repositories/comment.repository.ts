import { AppError } from "../utils/appError";
import {prisma} from '../config/db'

class CommentRepository {
  public async listByTask(taskId: string) {
    return prisma.comment.findMany({
       where:{ taskId, deletedAt: null },
       include:{author: {select:{id:true,name:true,avatarUrl:true}}},
       orderBy:{createdAt:'asc'}
      });

  }

  public async create(data: {
    taskId: string;
    projectId: string;
    authorId: string;
    body: string;
  }) {
    const comment = await prisma.comment.create({data, include:{author:{select:{id:true,name:true,avatarUrl:true}}}});
    return comment;
  }

  public async getComment(commentId: string) {
    const comment = await prisma.comment.findFirst({where:{ id: commentId, deletedAt: null }});
    if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
    return comment;
  }

  public async updateBody(commentId: string, body: string) {
    return prisma.comment.update({
      where:{id:commentId},
      data:{body},
      include:{author:{select:{id:true,name:true,avatarUrl:true}}}
    })
  }

  public async softDelete(commentId: string) {
    await prisma.comment.update({where:{ id:commentId}, data:{deletedAt:new Date()}});
  }

  // called when a task is deleted
  public async softDeleteByTask(taskId:string) {
    await prisma.comment.updateMany(
      {
        where:{taskId,deletedAt:null},
        data:{deletedAt:new Date()},
      }
    );
  }
}

export const commentRepository = new CommentRepository();

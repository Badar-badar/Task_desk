import type { Request, Response } from "express";
import type { ITask } from "../interfaces/iTask";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { getFileUrl } from "../services/storage.service";

export const getSummary = async (req: Request, res: Response) => {
  const workspaceId = req.workspaceId!;
  const user = req.user!;
  const projectIds = req.workspaceProjectScoped
    ? await projectRepository.getMyProjectIds(workspaceId, user.id)
    : null;
  const [projectCount, taskSummary, myTasks, recentProjects] = await Promise.all([
    projectRepository.countProjects(workspaceId, user.id),
    projectIds
      ? taskRepository.getTaskSummaryForProjects(workspaceId, projectIds)
      : taskRepository.getTaskSummary(workspaceId),
    projectIds
      ? taskRepository.getMyOpenTasksForProjects(workspaceId, user.id, projectIds)
      : taskRepository.getMyOpenTasks(workspaceId, user.id),
    projectRepository.getRecentProjects(workspaceId, user.id, 4),
  ]);
  const projectNames = await projectRepository.getProjectNames(
    workspaceId,
    [...new Set(myTasks.map((task) => task.projectId))],
  );
  const tasksWithProjectNames = await Promise.all(myTasks.map(async (task) => {
    const data = task;
    const taskAttachments = Array.isArray(data.attachments)
      ? (data.attachments as unknown as ITask.Attachment[])
      : [];
    const attachments = await Promise.all(taskAttachments.map(async (attachment) => ({
      ...attachment,
      url: await getFileUrl(attachment.key),
    })));
    return {
      ...data,
      attachments,
      projectName: projectNames.get(task.projectId) ?? null,
    };
  }));
  const statusBreakdown = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    ...taskSummary.statusBreakdown,
  };

  res.status(200).json({
    success: true,
    data: {
      counts: {
        projects: projectCount,
        tasks: taskSummary.total,
        completed: taskSummary.done,
        overdue: taskSummary.overdue,
      },
      statusBreakdown,
      myTasks: tasksWithProjectNames,
      recentProjects,
    },
  });
};

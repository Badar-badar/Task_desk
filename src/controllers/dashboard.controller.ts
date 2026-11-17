import type { Request, Response } from "express";
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { getFileUrl } from "../services/storage.service";

export const getSummary = async (req: Request, res: Response) => {
  const organizationId = req.organization!._id;
  const user = req.user!;
  const assignedOnly = user.role === "employee";
  const [projectCount, taskSummary, myTasks, recentProjects] = await Promise.all([
    projectRepository.countProjects(organizationId),
    taskRepository.getTaskSummary(organizationId, assignedOnly ? user._id : undefined),
    taskRepository.getMyOpenTasks(organizationId, user._id),
    projectRepository.getRecentProjects(organizationId, 4),
  ]);
  const projectNames = await projectRepository.getProjectNames(
    organizationId,
    [...new Map(myTasks.map((task) => [task.projectId.toString(), task.projectId])).values()],
  );
  const tasksWithProjectNames = await Promise.all(myTasks.map(async (task) => {
    const data = task.toObject();
    const attachments = await Promise.all(data.attachments.map(async (attachment) => ({
      ...attachment,
      url: await getFileUrl(attachment.key),
    })));
    return {
      ...data,
      attachments,
      projectName: projectNames.get(task.projectId.toString()) ?? null,
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

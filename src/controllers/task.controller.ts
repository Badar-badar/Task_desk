import { Request, Response, NextFunction } from "express";
import type { RequestHandler } from "express";
import { Types, type HydratedDocument } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { taskRepository } from "../repositories/task.repository";
import { projectRepository } from "../repositories/project.repository";
import { ProjectMemberModel } from "../models/projectMember.model";
import { ProjectModel } from "../models/project.model";
import {
  addTaskAttachments as uploadTaskAttachments,
  deleteTaskAttachment as removeTaskAttachment,
  deleteTaskWithAttachments,
  updateTaskWithAttachments,
} from "../services/taskAttachment.service";
import { getFileUrl } from "../services/storage.service";
import { AppError } from "../utils/appError";
import { redisCacheService } from "../services/redisCache.service";

const serializeTask = async (task: HydratedDocument<ITask.Model>) => {
  const data = task.toObject();
  const attachments = await Promise.all(
    (data.attachments ?? []).map(async (attachment) => ({
      ...attachment,
      url: await getFileUrl(attachment.key),
    })),
  );

  return {
    ...data,
    projectIds: [...new Set([data.projectId.toString(), ...(data.projectIds ?? []).map((id) => id.toString())])],
    attachments,
  };
};

const getParamString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

// assignee must belong to the project
const assertProjectMember = async (projectId: Types.ObjectId | string, userId: string) => {
  const member = await ProjectMemberModel.exists({ projectId, userId });
  if (!member) {
    throw new AppError(400, "VALIDATION_ERROR", "Assignee must be a member of this project");
  }
};

// Runs after upload.array so multipart fields are in req.body.
// Admin/editor can edit anything; an assignee with a lower role may only change status.
export const enforceAssigneeStatusOnly: RequestHandler = (req, _res, next) => {
  if (["admin", "editor"].includes(req.projectRole!)) return next();

  const files = Array.isArray(req.files) ? req.files : [];
  const fields = Object.keys(req.body ?? {});
  const onlyStatus = fields.length > 0 && fields.every((field) => field === "status");

  if (!onlyStatus || files.length > 0) {
    return next(new AppError(403, "FORBIDDEN", "You can only update the status of your own task"));
  }
  next();
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.projectId!;
    const files = Array.isArray(req.files) ? req.files : [];
    const body = req.body as ITask.CreateObj;

    if (body.assigneeId) await assertProjectMember(projectId, body.assigneeId.toString());

    let task = await taskRepository.createTask(projectId, req.user!._id, body);

    if (files.length) {
      try {
        task = await uploadTaskAttachments(req.workspaceId!, task._id.toString(), files);
      } catch (error) {
        try {
          await taskRepository.deleteTask(req.workspaceId!, task._id.toString());
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Task creation failed and the new task could not be rolled back",
          );
        }
        throw error;
      }
    }

    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: await serializeTask(task),
    });
  } catch (error) {
    next(error);
  }
};

export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.workspaceId!.toString();
    const userId = req.user!._id.toString();
    const scope = `project:${req.projectId!.toString()}`;
    const key = redisCacheService.taskListKey(workspaceId, userId, scope);
    const cached = await redisCacheService.get<unknown[]>(key);
    if (cached) {
      res.status(200).json({ success: true, data: cached });
      return;
    }
    const tasks = await taskRepository.listTasks(req.projectId!);
    const data = await Promise.all(tasks.map(serializeTask));
    await redisCacheService.set(key, data, redisCacheService.listTtlSeconds);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// tasks across all projects the user is a member of
export const listMyTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query as {
      projectId?: string;
      assigneeId?: string;
      status?: ITask.Model["status"];
    };

    const scope = `all:${JSON.stringify({
      projectId: query.projectId ?? null,
      assigneeId: query.assigneeId ?? null,
      status: query.status ?? null,
    })}`;
    const cacheKey = redisCacheService.taskListKey(
      req.workspaceId!.toString(),
      req.user!._id.toString(),
      scope,
    );
    const cached = await redisCacheService.get<unknown[]>(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: cached });
      return;
    }

    // only projects in the active workspace where I am a member
    let projectIds = await projectRepository.getMyProjectIds(req.workspaceId!, req.user!._id);

    if (query.projectId) {
      projectIds = projectIds.filter((id) => id.toString() === query.projectId);
    }

    const tasks = projectIds.length
      ? await taskRepository.listTasksByProjects(projectIds, {
          ...(query.assigneeId
            ? { assigneeId: query.assigneeId === "me" ? req.user!._id : new Types.ObjectId(query.assigneeId) }
            : {}),
          ...(query.status ? { status: query.status } : {}),
        })
      : [];

    const data = await Promise.all(tasks.map(serializeTask));
    await redisCacheService.set(cacheKey, data, redisCacheService.listTtlSeconds);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const addTaskProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = new Types.ObjectId((req.body as { projectId: string }).projectId);
    const project = await ProjectModel.findOne({ _id: projectId, workspaceId: req.workspaceId }).select("_id");
    if (!project) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found in this workspace");
    const membership = await ProjectMemberModel.findOne({ projectId, userId: req.user!._id }).lean();
    if (!membership) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    if (!["admin", "editor"].includes(membership.role)) throw new AppError(403, "FORBIDDEN", "You need editor access to add tasks to this project");

    const task = await taskRepository.addProjectLink(req.task!, projectId);
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
    res.status(200).json({ success: true, data: await serializeTask(task) });
  } catch (error) { next(error); }
};

export const removeTaskProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = new Types.ObjectId(getParamString(req.params.projectId));
    const membership = await ProjectMemberModel.findOne({ projectId, userId: req.user!._id }).lean();
    if (!membership) throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
    if (!["admin", "editor"].includes(membership.role)) throw new AppError(403, "FORBIDDEN", "You need editor access to remove tasks from this project");

    const task = await taskRepository.removeProjectLink(req.task!, projectId);
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());
    res.status(200).json({ success: true, data: await serializeTask(task) });
  } catch (error) { next(error); }
};

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // already loaded and access-checked by taskAccess
    res.status(200).json({ success: true, data: await serializeTask(req.task!) });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const files = Array.isArray(req.files) ? req.files : [];
    const updates = (req.body ?? {}) as ITask.UpdateObj;

    if (!Object.keys(updates).length && !files.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Provide fields to update or attach at least one file");
    }

    if (updates.assigneeId) {
      await assertProjectMember(req.projectId!, updates.assigneeId.toString());
    }

    const task = await updateTaskWithAttachments(req.workspaceId!, taskId, updates, files);
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: await serializeTask(task),
    });
  } catch (error) {
    next(error);
  }
};

export const addTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      throw new AppError(400, "NO_FILES", "Select at least one file to upload");
    }
    const task = await uploadTaskAttachments(req.workspaceId!, taskId, files);
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

    res.status(201).json({
      success: true,
      message: "Task attachments uploaded successfully",
      data: await serializeTask(task),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const attachmentId = getParamString(req.params.attachmentId);
    const task = await removeTaskAttachment(req.workspaceId!, taskId, attachmentId);
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

    res.status(200).json({
      success: true,
      message: "Task attachment deleted successfully",
      data: await serializeTask(task),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteTaskWithAttachments(req.workspaceId!, getParamString(req.params.taskId));
    await redisCacheService.invalidateWorkspaceLists(req.workspaceId!.toString());

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};

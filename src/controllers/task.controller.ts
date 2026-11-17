import { Request, Response, NextFunction } from "express";
import type { RequestHandler } from "express";
import { Types, type HydratedDocument } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { taskRepository } from "../repositories/task.repository";
import {
  addTaskAttachments as uploadTaskAttachments,
  deleteTaskAttachment as removeTaskAttachment,
  deleteTaskWithAttachments,
  updateTaskWithAttachments,
} from "../services/taskAttachment.service";
import { getFileUrl } from "../services/storage.service";
import { AppError } from "../utils/appError";

const serializeTask = async (task: HydratedDocument<ITask.Model>) => {
  const data = task.toObject();
  const attachments = await Promise.all(
    (data.attachments ?? []).map(async (attachment) => ({
      ...attachment,
      url: await getFileUrl(attachment.key),
    })),
  );

  return { ...data, attachments };
};

const getParamString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const assertTaskAccess = (
  task: HydratedDocument<ITask.Model>,
  request: Request,
) => {
  const user = request.user!;
  if (user.role === "owner" || user.role === "admin") return;
  if (user.role === "employee" && task.assigneeId?.equals(user._id)) return;
  throw new AppError(403, "API_ERROR", "You do not have permission to do this");
};

export const authorizeTaskAccess: RequestHandler = async (req, _res, next) => {
  try {
    const task = await taskRepository.getTask(req.organization!._id, getParamString(req.params.taskId));
    assertTaskAccess(task, req);
    next();
  } catch (error) {
    next(error);
  }
};

export const enforceEmployeeStatusOnly: RequestHandler = (req, _res, next) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const fields = Object.keys(req.body ?? {});
  if (
    req.user!.role === "employee"
    && (files.length > 0 || fields.some((field) => field !== "status"))
  ) {
    next(new AppError(403, "API_ERROR", "You do not have permission to do this"));
    return;
  }
  next();
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParamString(req.params.projectId);
    const files = Array.isArray(req.files) ? req.files : [];
    let task = await taskRepository.createTask(
      req.organization!._id,
      projectId,
      req.user!._id,
      req.body as ITask.CreateObj,
    );

    if (files.length) {
      try {
        task = await uploadTaskAttachments(req.organization!._id, task._id.toString(), files);
      } catch (error) {
        try {
          await taskRepository.deleteTask(req.organization!._id, task._id.toString());
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Task creation failed and the new task could not be rolled back",
          );
        }
        throw error;
      }
    }

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
    const projectId = getParamString(req.params.projectId);
    const tasks = await taskRepository.listTasks(req.organization!._id, projectId);

    res.status(200).json({ success: true, data: await Promise.all(tasks.map(serializeTask)) });
  } catch (error) {
    next(error);
  }
};

export const listOrganizationTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query as {
      projectId?: string;
      assigneeId?: string;
      status?: ITask.Model["status"];
    };
    const tasks = await taskRepository.listOrganizationTasks(req.organization!._id, {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.assigneeId
        ? { assigneeId: query.assigneeId === "me" ? req.user!._id : new Types.ObjectId(query.assigneeId) }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    });

    res.status(200).json({ success: true, data: await Promise.all(tasks.map(serializeTask)) });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const task = await taskRepository.getTask(req.organization!._id, taskId);

    res.status(200).json({ success: true, data: await serializeTask(task) });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const files = Array.isArray(req.files) ? req.files : [];
    const currentTask = await taskRepository.getTask(req.organization!._id, taskId);
    assertTaskAccess(currentTask, req);

    const updates = (req.body ?? {}) as ITask.UpdateObj;
    if (req.user!.role === "employee") {
      if (files.length || Object.keys(updates).some((field) => field !== "status")) {
        throw new AppError(403, "API_ERROR", "You do not have permission to do this");
      }
    }
    if (!Object.keys(updates).length && !files.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Provide fields to update or attach at least one file");
    }
    const task = await updateTaskWithAttachments(req.organization!._id, taskId, updates, files);

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
    const currentTask = await taskRepository.getTask(req.organization!._id, taskId);
    assertTaskAccess(currentTask, req);

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      throw new AppError(400, "NO_FILES", "Select at least one file to upload");
    }
    const task = await uploadTaskAttachments(req.organization!._id, taskId, files);

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
    const currentTask = await taskRepository.getTask(req.organization!._id, taskId);
    assertTaskAccess(currentTask, req);
    const task = await removeTaskAttachment(req.organization!._id, taskId, attachmentId);

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
    const taskId = getParamString(req.params.taskId);
    await deleteTaskWithAttachments(req.organization!._id, taskId);

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};


import { Request, Response, NextFunction } from "express";
import type { HydratedDocument } from "mongoose";
import { getFileUrl } from "../services/storage.service";
import {
  addTaskAttachments as uploadTaskAttachments,
  updateTaskWithAttachments,
} from "../services/taskAttachment.service";
import {taskRepository} from "../repositories/task.repository";
import { ITask } from "../interfaces/iTask";
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
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParamString(req.params.projectId);
    const files = Array.isArray(req.files) ? req.files : [];
    let task = await taskRepository.createTask(req.organization!._id,projectId,req.user!._id,req.body as ITask.CreateObj);

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

    res.status(201).json({success: true,message: "Task created successfully",data: await serializeTask(task)});
  } catch (error) {
    next(error);
  }
};

export const listTasks = async (req: Request,res: Response,next: NextFunction) => {
  try {
    const projectId = getParamString(req.params.projectId);
    const tasks = await taskRepository.listTasks(req.organization!._id,projectId);

    res.status(200).json({ success: true,data: await Promise.all(tasks.map(serializeTask))});
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const task = await taskRepository.getTask(req.organization!._id,taskId);

    res.status(200).json({success: true,data: await serializeTask(task)});
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const files = Array.isArray(req.files) ? req.files : [];
    const updates = (req.body ?? {}) as ITask.UpdateObj;
    if (!Object.keys(updates).length && !files.length) {
      throw new AppError(400, "VALIDATION_ERROR", "Provide fields to update or attach at least one file");
    }
    const task = await updateTaskWithAttachments(req.organization!._id, taskId, updates, files);

    res.status(200).json({success: true, message: "Task updated successfully",data: await serializeTask(task)});
  } catch (error) {
    next(error);
  }
};

export const addTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      throw new AppError(400, "NO_FILES", "Select at least one file to upload");
    }

    const taskId = getParamString(req.params.taskId);
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

export const deleteTask = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    await taskRepository.deleteTask(req.organization!._id,taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

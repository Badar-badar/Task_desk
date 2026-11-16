
import { Request, Response, NextFunction } from "express";
import * as taskService from "../services/task.service";
import { ITask } from "../interfaces/iTask";

const getParamString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = getParamString(req.params.projectId);
    const task = await taskService.createTask(req.organization!._id,projectId,req.user!._id,req.body as ITask.CreateObj);

    res.status(201).json({success: true,message: "Task created successfully",data: task});
  } catch (error) {
    next(error);
  }
};

export const listTasks = async (req: Request,res: Response,next: NextFunction) => {
  try {
    const projectId = getParamString(req.params.projectId);
    const tasks = await taskService.listTasks(req.organization!._id,projectId);

    res.status(200).json({ success: true,data: tasks});
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    const task = await taskService.getTask(req.organization!._id,taskId);

    res.status(200).json({success: true,data: task});
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
    const task = await taskService.updateTask(req.organization!._id,taskId, req.body as ITask.UpdateObj);

    res.status(200).json({success: true, message: "Task updated successfully",data: task});
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request,res: Response, next: NextFunction) => {
  try {
    const taskId = getParamString(req.params.taskId);
    await taskService.deleteTask(req.organization!._id,taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

import { Types } from "mongoose";
import { ITask } from "../interfaces/iTask";
import { taskRepository } from "../repositories/task.repository";
import { deleteFile, uploadFile } from "./storage.service";

async function cleanupUploadedFiles(
  attachments: ITask.NewAttachment[],
  originalError: unknown,
): Promise<never> {
  const cleanupErrors: unknown[] = [];

  for (const attachment of attachments) {
    try {
      await deleteFile(attachment.key);
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
  }

  if (cleanupErrors.length) {
    throw new AggregateError(
      [originalError, ...cleanupErrors],
      "Task attachment operation failed and R2 cleanup was incomplete",
    );
  }

  throw originalError;
}

async function uploadTaskFiles(
  organizationId: Types.ObjectId,
  taskId: string,
  files: Express.Multer.File[],
): Promise<ITask.NewAttachment[]> {
  const uploaded: ITask.NewAttachment[] = [];

  try {
    for (const file of files) {
      uploaded.push(
        await uploadFile(file, `organizations/${organizationId}/tasks/${taskId}`),
      );
    }
  } catch (error) {
    return cleanupUploadedFiles(uploaded, error);
  }

  return uploaded;
}

export async function addTaskAttachments(
  organizationId: Types.ObjectId,
  taskId: string,
  files: Express.Multer.File[],
) {
  await taskRepository.getTask(organizationId, taskId);
  const attachments = await uploadTaskFiles(organizationId, taskId, files);

  try {
    return await taskRepository.addAttachments(organizationId, taskId, attachments);
  } catch (error) {
    return cleanupUploadedFiles(attachments, error);
  }
}

export async function updateTaskWithAttachments(
  organizationId: Types.ObjectId,
  taskId: string,
  input: ITask.UpdateObj,
  files: Express.Multer.File[],
) {
  if (!files.length) {
    return taskRepository.updateTask(organizationId, taskId, input);
  }

  await taskRepository.getTask(organizationId, taskId);
  const attachments = await uploadTaskFiles(organizationId, taskId, files);

  try {
    return await taskRepository.updateTask(organizationId, taskId, input, attachments);
  } catch (error) {
    return cleanupUploadedFiles(attachments, error);
  }
}

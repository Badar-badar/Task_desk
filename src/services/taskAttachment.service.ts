import { randomUUID } from "crypto";
import type { ITask } from "../interfaces/iTask";
import { taskRepository } from "../repositories/task.repository";
import { AppError } from "../utils/appError";
import { deleteFile, uploadFile } from "./storage.service";

// what uploadFile returns, before we give it an id
type UploadedFile = Omit<ITask.Attachment, "id">;

const readAttachments = (value: unknown): ITask.Attachment[] =>
  Array.isArray(value) ? (value as ITask.Attachment[]) : [];

async function cleanupUploadedFiles(
  attachments: { key: string }[],
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
  workspaceId: string,
  taskId: string,
  files: Express.Multer.File[],
): Promise<ITask.Attachment[]> {
  const uploaded: ITask.Attachment[] = [];

  try {
    for (const file of files) {
      const result: UploadedFile = await uploadFile(
        file,
        `workspaces/${workspaceId}/tasks/${taskId}`,
      );
      uploaded.push({ id: randomUUID(), ...result });
    }
  } catch (error) {
    return cleanupUploadedFiles(uploaded, error);
  }

  return uploaded;
}

export async function addTaskAttachments(
  workspaceId: string,
  taskId: string,
  files: Express.Multer.File[],
) {
  await taskRepository.getTask(workspaceId, taskId);
  const attachments = await uploadTaskFiles(workspaceId, taskId, files);

  try {
    return await taskRepository.addAttachments(workspaceId, taskId, attachments);
  } catch (error) {
    return cleanupUploadedFiles(attachments, error);
  }
}

export async function updateTaskWithAttachments(
  workspaceId: string,
  taskId: string,
  input: ITask.UpdateObj,
  files: Express.Multer.File[],
) {
  if (!files.length) {
    return taskRepository.updateTask(workspaceId, taskId, input);
  }

  await taskRepository.getTask(workspaceId, taskId);
  const attachments = await uploadTaskFiles(workspaceId, taskId, files);

  try {
    return await taskRepository.updateTask(workspaceId, taskId, input, attachments);
  } catch (error) {
    return cleanupUploadedFiles(attachments, error);
  }
}

export async function deleteTaskWithAttachments(workspaceId: string, taskId: string) {
  const task = await taskRepository.getTask(workspaceId, taskId);
  for (const attachment of readAttachments(task.attachments)) {
    await deleteFile(attachment.key);
  }
  return taskRepository.deleteTask(workspaceId, taskId);
}

export async function deleteTaskAttachment(
  workspaceId: string,
  taskId: string,
  attachmentId: string,
) {
  const task = await taskRepository.getTask(workspaceId, taskId);
  const attachment = readAttachments(task.attachments).find((item) => item.id === attachmentId);
  if (!attachment) {
    throw new AppError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");
  }

  await deleteFile(attachment.key);
  return taskRepository.removeAttachment(workspaceId, taskId, attachmentId);
}
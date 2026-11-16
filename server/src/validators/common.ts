import {z} from 'zod'

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const userIdParams = z.object({ userId: objectId });
export const projectIdParams = z.object({ projectId: objectId });
export const taskIdParams = z.object({ taskId: objectId });
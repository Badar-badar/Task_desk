import { z } from 'zod';
import { PROJECT_STATUSES } from '../models/enums';
import {  projectIdParams } from './common';

const createBody = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(150),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

const updateBody = createBody
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Provide at least one field to update');



export const createProjectSchema = { body: createBody };
export const projectIdSchema = { params: projectIdParams };
export const updateProjectSchema = { params: projectIdParams, body: updateBody };

export type CreateProjectInput = z.infer<typeof createBody>;
export type UpdateProjectInput = z.infer<typeof updateBody>;
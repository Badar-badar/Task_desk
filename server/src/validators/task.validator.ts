import {z} from 'zod'
import {TASK_STATUSES} from '../models/enums'
import { taskIdParams } from './common'

const createBody = z.object({
      title: z.string({error: 'name is required'}).trim().min(2,"task character should be at least 2 ").max(120,"max character should be at most 120"),
      description:z.string().trim().max(1000,'Max character should be at most 1000 character').optional(),
      status:z.enum(TASK_STATUSES).optional(),
      dueDate:z.coerce.date().optional(),
      completedAt:z.coerce.date().optional()


});

const updateBody = createBody
   .partial()
   .refine((d) => Object.keys(d).length > 0 , 'Provide at least one field to update');

   export const createBodySchema = {body: createBody};
   export const taskIdSchema = {params: taskIdParams};
   export const updateBodySchema = {params:taskIdParams,body: updateBody};

export type CreateBodyInput = z.infer<typeof createBody>
export type UpdateBodyInput = z.infer<typeof updateBody>
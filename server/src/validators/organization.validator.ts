import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '../models/enums';
import { userIdParams } from './common';


const orgFields = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
});

const createBody = orgFields;

const updateBody = orgFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

const addMemberBody = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  role: z.enum(ASSIGNABLE_ROLES, { error: 'Role must be admin, employee' }).default('employee'),
});

const changeRoleBody = z.object({
    role : z.enum(ASSIGNABLE_ROLES, {error : "Role must be admin or employee"})
});



export const createOrgSchema = { body: createBody };
export const updateOrgSchema = { body: updateBody };
export const addMemberSchema = { body: addMemberBody };
export const memberIdSchema = { params: userIdParams };
export const changeRoleSchema = {body:changeRoleBody}


export type CreateOrgInput = z.infer<typeof createBody>;
export type UpdateOrgInput = z.infer<typeof updateBody>;
export type AddMemberInput = z.infer<typeof addMemberBody>;
export type ChangeRoleInput = z.infer<typeof changeRoleBody>

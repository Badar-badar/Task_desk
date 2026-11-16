import {Router} from 'express'
import {authenticate} from '../middlewares/auth'
import {validate} from '../middlewares/validate'
import { createOrgSchema, updateOrgSchema, addMemberSchema, changeRoleSchema,memberIdSchema } from '../validators/organization.validator'
import {create, getMine, update, remove, getMembers,addNewMember, changeRole,removeMember} from '../controllers/organization.controller'
import { requireRole } from '../middlewares/rbac'
import { orgContext } from '../middlewares/orgContext'
const router = Router();

router.use(authenticate);

router.post('/',validate(createOrgSchema), create);

router.use(orgContext)
router.get('/', getMine);
router.patch('/', requireRole('owner','admin'),validate(updateOrgSchema),update)
router.delete('/', requireRole('owner'),remove)

router.get('/members',requireRole('owner', 'admin'), getMembers,);
router.post('/members', validate(addMemberSchema), requireRole('owner', 'admin'),addNewMember);
router.patch('/members/:userId', validate(changeRoleSchema), requireRole('owner', 'admin'),changeRole);
router.delete('/members/:userId', validate(memberIdSchema),requireRole('owner', 'admin'),removeMember);
export default router;
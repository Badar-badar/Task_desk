import {Router} from 'express'
import { requireRole } from '../middlewares/rbac';
import { authenticate } from '../middlewares/auth';
import { orgContext } from '../middlewares/orgContext';
import {create,getProjects, update,remove,getOne} from '../controllers/project.controller'
import { validate } from '../middlewares/validate';
import {createProjectSchema, projectIdSchema, updateProjectSchema} from '../validators/project.validator'

const router = Router();
router.use(authenticate,orgContext)
router.get('/',requireRole('owner','admin'), getProjects);
router.get("/:projectId", validate(projectIdSchema), getOne);
router.post('/',requireRole('owner','admin'),validate(createProjectSchema),create)
router.patch("/:projectId", requireRole("owner", "admin"), validate(updateProjectSchema), update);
router.delete('/:projectId', validate(projectIdSchema), requireRole('owner', 'admin'),remove);    
export default router;
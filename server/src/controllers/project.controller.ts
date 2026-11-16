import { Request,Response } from "express"
import {createProject,listProjects, updateProject, deleteProject,getProject } from '../services/project.service'
import { CreateProjectInput, UpdateProjectInput } from "../validators/project.validator"


export const create = async(req:Request, res:Response) =>{
    const prt = await createProject(req.organization!._id,req.user!._id,req.body as CreateProjectInput);
    res.status(201).json({success:true,project: prt})
}


export const getProjects = async(req:Request, res:Response) =>{
    const prts = await listProjects(req.organization!._id);
    res.status(201).json({success:true,projects: prts})
}

export const getOne = async (req: Request, res: Response) => {
  const project = await getProject(req.organization!._id, req.params.projectId as string);
  res.status(200).json({ success: true, project });
};

export const update = async (req: Request, res: Response) => {
  const project = await updateProject(req.organization!._id,req.params.projectId as string,req.body as UpdateProjectInput);
   res.status(201).json({success:true,projects: project})
};

export const remove = async (req: Request, res: Response) => {
  await deleteProject(req.organization!._id, req.params.projectId as string);
  res.status(200).json({ success: true, message: "Project deleted" });
};
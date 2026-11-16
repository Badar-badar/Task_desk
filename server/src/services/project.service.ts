import { Types } from "mongoose";
import { CreateProjectInput, UpdateProjectInput } from "../validators/project.validator";
import { Project } from "../models/project.model";
import { ApiError } from "../utils/ApiError";

export const createProject = async(orgId:Types.ObjectId, userId:Types.ObjectId, data: CreateProjectInput) =>{
     const { dueDate, ...rest } = data;

  const project = await Project.create({
    ...rest,
    ...(dueDate !== undefined && { endDate: dueDate }),
    organizationId: orgId,
    createdBy: userId,
  });    
     return project;
}

export const listProjects = async(orgId:Types.ObjectId) =>{
     const projects = await Project.find({organizationId: orgId});
     if(!projects){
        throw new ApiError(409,"Projects not found");
     }
     return projects;
}
export const getProject = async (orgId: Types.ObjectId, projectId: string) => {
  const project = await Project.findOne({
    _id: projectId,
    organizationId: orgId,
  });
  if (!project) throw new ApiError(404, "Project not found");
  return project;
};

export const updateProject = async (orgId: Types.ObjectId,projectId: string,data: UpdateProjectInput) => {
  const { dueDate, ...rest } = data;
  const changes = {
    ...rest,
    ...(dueDate !== undefined && { endDate: dueDate }),
  };

  const project = await Project.findOneAndUpdate(
    { _id: projectId, organizationId: orgId },
    { $set: changes },
    { new: true}
  );
  if (!project) throw new ApiError(404, "Project not found");
  return project;
};


export const deleteProject = async (orgId: Types.ObjectId, projectId: string) => {
  const project = await Project.findOneAndDelete({
    _id: projectId,
    organizationId: orgId,
  });
  if (!project) throw new ApiError(404, "Project not found");

//   await Task.deleteMany({ projectId: project._id, organizationId: orgId });

  return project;
};

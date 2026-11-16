import {Request, Response} from 'express'
import { CreateOrgInput, UpdateOrgInput, ChangeRoleInput } from '../validators/organization.validator'
import {createOrganization, updateOrganization, deleteOrganization, listMembers,addMember, changeMemberRole,removeOrgMember} from '../services/organization.service'


export const create = async(req:Request, res:Response)=>{
    const org = await createOrganization(req.user!, req.body as CreateOrgInput);
    res.status(201).json({success:true, organization: org})
}

export const getMine = async(req:Request, res:Response)=>{
    res.status(201).json({success:true, Organization: req.organization, role: req.user!.role})
}


export const update = async(req:Request, res:Response)=>{
    const org = await updateOrganization(req.organization!._id, req.body as UpdateOrgInput);
    res.status(201).json({success:true, organization: org})
}

export const remove = async(req:Request, res:Response)=>{
     deleteOrganization(req.organization!._id);
    res.status(201).send();
}

export const getMembers = async(req:Request, res:Response)=>{
    const mem = await listMembers(req.organization!._id);
    res.status(201).json({success:true, member: mem})
}

export const addNewMember = async(req:Request, res:Response)=>{
    const {email, role} = req.body;
    const mem = await addMember(req.organization!._id,email, role);
    res.status(201).json({success:true, member: mem})
}

export const changeRole = async(req:Request, res:Response)=>{
    const {role} = req.body as ChangeRoleInput;
    const memRole = await changeMemberRole(req.organization!._id,req.user!.role!,req.params.userId as string, role);
    res.status(201).json({success:true, member: memRole})
}

export const removeMember = async(req:Request, res:Response)=>{
    await removeOrgMember(req.organization!._id,req.user!._id,req.user!.role!,req.params.userId as string);
    res.status(201).send()
}



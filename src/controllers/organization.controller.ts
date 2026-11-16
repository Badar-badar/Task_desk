
import type { Request, Response } from "express";
import type { IOrganization } from "../interfaces/iOrganization";
import type { OrgRole } from "../models/enums";
import { organizationRepository } from "../repositories/organization.repository";

export const organizationController = {
  async create(request: Request, response: Response): Promise<void> {
    const user = request.user!;
    const organization = await organizationRepository.create(request.body as IOrganization.CreateObj, user._id,);

    response.status(201).json({success: true,data: organization,});
  },

  async getMine(request: Request, response: Response): Promise<void> {
    const organization = await organizationRepository.findMine(request.user!._id,);

    response.status(200).json({success: true,
      data: {
        organization,
        role: request.user!.role,
      },
    });
  },

  async update(request: Request, response: Response): Promise<void> {
    const organization = await organizationRepository.updateById(request.organization!._id,request.body as IOrganization.UpdateObj,);

    response.status(200).json({ success: true,data: organization,});
  },

  async remove(request: Request, response: Response): Promise<void> {
    await organizationRepository.deleteById(request.organization!._id,);

    response.status(200).json({success: true,message: "Organization deleted successfully",});
  },

  async getMembers(request: Request, response: Response): Promise<void> {
    const members = await organizationRepository.findMembers(request.organization!._id,);

    response.status(200).json({success: true,data: members});
  },

  async addMember(request: Request, response: Response): Promise<void> {
    const member = await organizationRepository.addMember(request.organization!._id, request.body as IOrganization.AddMemberObj,);

    response.status(201).json({success: true, data: member});
  },

  async changeRole(request: Request, response: Response): Promise<void> {
    const input = request.body as IOrganization.ChangeRoleObj;

    const member = await organizationRepository.changeMemberRole(request.organization!._id,request.user!.role as OrgRole, request.params.userId as string,input.role,);

    response.status(200).json({success: true, data: member,});
  },

 
  async removeMember(request: Request, response: Response): Promise<void> {
    await organizationRepository.removeMember(request.organization!._id,request.user!._id,request.user!.role as OrgRole,request.params.userId as string,);

    response.status(200).json({success: true,message: "Member removed successfully"});
  },
};

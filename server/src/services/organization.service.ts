import { Types } from 'mongoose';
import { CreateOrgInput, UpdateOrgInput } from '../validators/organization.validator';
import {Organization} from '../models/organization.model';
import { OrgRole } from '../models/enums';
import { User } from '../models/user.model';
import { ApiError } from '../utils/ApiError';

const slugify = (name: string) =>name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'org';

export const createOrganization = async ( user: { _id: Types.ObjectId; organizationId: Types.ObjectId | null },data: CreateOrgInput) => {
  if (user.organizationId) throw new ApiError(409, 'You already belong to an organization');

  const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { description, ...rest } = data;
  const organization = await Organization.create({
    ...rest,
    ...(description !== undefined ? { description } : {}),
    slug,
    ownerId: user._id,
  });


  const updated = await User.findOneAndUpdate(
    { _id: user._id, organizationId: null },
    { organizationId: organization._id, role: 'owner' },
    { new: true }
  );
  if (!updated) {
    await Organization.deleteOne({ _id: organization._id }); // roll back
    throw new ApiError(409, 'You already belong to an organization');
  }
  return organization;
};

export const updateOrganization = async (orgId: Types.ObjectId, data: UpdateOrgInput) => {
  const { name, description } = data;

  const update: { name?: string; description?: string } = {};

  if (name !== undefined){
    update.name = name;
  } 
  if (description !== undefined) update.description = description;

  return Organization.findOneAndUpdate({ _id: orgId, deletedAt: null }, update, { new: true });
};

export const deleteOrganization = async (orgId: Types.ObjectId) => {
  const now = new Date();
  
};


export const listMembers = async (orgId: Types.ObjectId) =>
  User.find({ organizationId: orgId }).select('name email role createdAt');



export const addMember = async (orgId: Types.ObjectId, email: string, role: OrgRole) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'No OrgFlow user with this email. They must sign up first');


  const updated = await User.findOneAndUpdate(
    { _id: user._id, organizationId: null },
    { organizationId: orgId, role },
    { new: true }
  ).select('name email avatarUrl role');
  if (!updated) throw new ApiError(409, 'This user already belongs to an organization');

  return updated;
};

export const changeMemberRole = async (orgId: Types.ObjectId, oldRole: OrgRole, targetUserId: string,newRole: OrgRole) => {
  const target = await User.findOne({ _id: targetUserId, organizationId: orgId });
  if (!target) throw new ApiError(404, 'Member not found');
  if (target.role === 'owner') throw new ApiError(403, 'The owner role cannot be changed');
  if (oldRole === 'admin' && (target.role === 'admin' || newRole === 'admin')) {
    throw new ApiError(403, 'Only the owner can manage admins');
  }

  target.role = newRole;
  await target.save();
  return { _id: target._id, name: target.name, email: target.email, role: target.role };
};

export const removeOrgMember = async(orgId:Types.ObjectId,actorId:Types.ObjectId,actorRole:OrgRole,targetUserId:string) =>{
    const target = await User.findOne({_id:targetUserId, organizationId:orgId});
    if(!target){
      throw new ApiError(404,'Member not found');
    }
    if(target.role === 'owner'){
      throw new ApiError(401,'owner can not be removed')
    }

    const isSelf = target._id.equals(actorId);
    if (!isSelf && actorRole === 'admin' && target.role === 'admin') {
      throw new ApiError(403, 'Only the owner can remove admins');
    }
    
    target.organizationId = null;
    target.role = null;
    await target.save();

}


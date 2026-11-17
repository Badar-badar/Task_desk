import { Types } from "mongoose";
import type { IOrganization } from "../interfaces/iOrganization";
import { OrganizationModel } from "../models/organization.model";
import { User } from "../models/user.model";
import { Task } from "../models/task.model";
import type { OrgRole } from "../models/enums";
import { AppError } from "../utils/appError";

const slugify = (name: string): string =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";

class OrganizationRepository {
  public async create(input: IOrganization.CreateObj, ownerId: Types.ObjectId): Promise<IOrganization.PersistenceModel> {
    const existingUser = await User.findOne({ _id: ownerId, organizationId: null });

    if (!existingUser) throw new AppError(409, "ORGANIZATION_ALREADY_EXISTS", "You already belong to an organization");

    const slug = `${slugify(input.name)}-${new Types.ObjectId().toString().slice(-6)}`;

    const organization = await OrganizationModel.create({
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      slug,
      ownerId,
    });

    const updatedUser = await User.findOneAndUpdate(
      { _id: ownerId, organizationId: null },
      { $set: { organizationId: organization._id, role: "owner" } },
      { new: true }
    );

    if (!updatedUser) {
      await OrganizationModel.deleteOne({ _id: organization._id });
      throw new AppError(409, "ORGANIZATION_ALREADY_EXISTS", "You already belong to an organization");
    }

    return organization.toObject();
  }

  public async findMine(userId: Types.ObjectId): Promise<IOrganization.PersistenceModel> {
    const user = await User.findById(userId).select("organizationId");

    if (!user?.organizationId) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "You do not belong to an organization");

    const organization = await OrganizationModel.findOne({ _id: user.organizationId, deletedAt: null }).lean();

    if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization not found");

    return organization as IOrganization.PersistenceModel;
  }


  public async updateById(organizationId: Types.ObjectId, input: IOrganization.UpdateObj): Promise<IOrganization.PersistenceModel> {
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId, deletedAt: null },
      { $set: input },
      { new: true, runValidators: true }
    ).lean();

    if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization not found");

    return organization as IOrganization.PersistenceModel;
  }

  public async deleteById(organizationId: Types.ObjectId): Promise<void> {
    const organization = await OrganizationModel.findOneAndUpdate(
      { _id: organizationId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Organization not found");

    await User.updateMany(
      { organizationId },
      { $set: { organizationId: null, role: null } }
    );
  }



  public async findMembers(organizationId: Types.ObjectId): Promise<IOrganization.Member[]> {
    return User.find({ organizationId })
      .select("name email avatarUrl role createdAt")
      .lean<IOrganization.Member[]>();
  }

  public async addMember(organizationId: Types.ObjectId, input: IOrganization.AddMemberObj): Promise<IOrganization.Member> {
    const user = await User.findOne({ email: input.email });

    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User must sign up before joining an organization");

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, organizationId: null },
      { $set: { organizationId, role: input.role } },
      { new: true }
    ).select("name email avatarUrl role createdAt");

    if (!updatedUser) throw new AppError(409, "USER_ALREADY_ASSIGNED", "This user already belongs to an organization");

    return updatedUser.toObject() as IOrganization.Member;
  }



  public async changeMemberRole(organizationId: Types.ObjectId,actorRole: OrgRole,targetUserId: string,newRole: OrgRole): Promise<IOrganization.Member> {
    const target = await User.findOne({ _id: targetUserId, organizationId });

    if (!target) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (target.role === "owner") throw new AppError(403, "OWNER_ROLE_PROTECTED", "Owner role cannot be changed");

    if (actorRole === "admin" && (target.role === "admin" || newRole === "admin")) {
      throw new AppError(403, "ADMIN_PERMISSION_DENIED", "Only the owner can manage admins");
    }

    target.role = newRole;
    await target.save();

    return {
      _id: target._id,
      name: target.name,
      email: target.email,
      avatarUrl: target.avatarUrl ?? undefined,
      role: target.role,
      createdAt: target.createdAt,
    };
  }

  public async removeMember(organizationId: Types.ObjectId,actorId: Types.ObjectId,actorRole: OrgRole,targetUserId: string): Promise<void> {
    const target = await User.findOne({ _id: targetUserId, organizationId });

    if (!target) throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");

    if (target.role === "owner") throw new AppError(403, "OWNER_CANNOT_BE_REMOVED", "Organization owner cannot be removed");

    const isSelf = target._id.equals(actorId);

    if (!isSelf && actorRole === "admin" && target.role === "admin") {
      throw new AppError(403, "ADMIN_PERMISSION_DENIED", "Only the owner can remove admins");
    }

    target.organizationId = null;
    target.role = null;
    await target.save();
    await Task.updateMany(
      { organizationId, assigneeId: target._id },
      { $set: { assigneeId: null } },
    );
  }
}

export const organizationRepository = new OrganizationRepository();
import { Schema, Types, model } from "mongoose";
import type { WorkspaceRole } from "./enums";

export interface IUser{
    _id: Types.ObjectId,
    firebaseUid:string,
    name:string,
    email:string,
    avatarUrl?: string | null,
    isActive:boolean,
    lastLogin?: Date,
    createdAt: Date,
    updatedAt: Date;
    workspaceId?: Types.ObjectId | null;
    role?: WorkspaceRole | null;
};


const userSchema = new Schema<IUser>(
    {
        firebaseUid:{
            type:String,
            required:true,
            unique:true
        },
        name:{
            type:String,
            required:true,
            trim:true
        },
        email:{
            type:String,
            required:true,
            trim:true,
            lowercase:true,
            unique:true
        },
       
        isActive:{
            type:Boolean,
            default: true,
        },
        lastLogin:{
            type:Date
        },
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
        role: { type: String, enum: ["owner", "member"], default: null },
    },
    {
        timestamps:true,
    },
);

export const User = model<IUser>("User", userSchema);


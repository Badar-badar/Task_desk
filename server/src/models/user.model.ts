import {Schema, Types, model} from "mongoose";
import {ORG_ROLES, OrgRole} from './enums'

export interface IUser{
    _id: Types.ObjectId,
    firebaseUid:string,
    name:string,
    email:string,
    organizationId:Types.ObjectId,
    role:OrgRole | null,
    isActive:boolean,
    lastLogin?: Date,
    createdAt: Date,
    updatedAt: Date
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
        organizationId:{
            type:Schema.Types.ObjectId,
            ref:'Organization',
            default:null
        },
        role:{
            type:String,
            enum: [...ORG_ROLES,null],
            default:null
        },
        isActive:{
            type:Boolean,
            default: true,
        },
        lastLogin:{
            type:Date
        }
    },
    {
        timestamps:true,
    }
)

export const User = model<IUser>('User',userSchema);
import { Schema, model, Types } from 'mongoose';

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}



const organizationSchema = new Schema<IOrganization>(
  {
    name: {
         type: String,
         required: true,
         trim: true,
         maxlength: 120 
        },
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },

    description: { 
        type:  String, 
        maxlength: 500 
    },
    ownerId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
  },
  { 
    timestamps: true 

  }
);

export const Organization = model<IOrganization>('Organization', organizationSchema);
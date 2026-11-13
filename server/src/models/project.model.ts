import { Schema, model, Types } from 'mongoose';
import { PROJECT_STATUSES, ProjectStatus } from './enums';

export interface IProject {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}



const projectSchema = new Schema<IProject>(
  {
    organizationId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Organization', 
        required: true 
    },
    name: { 
        type: String, 
        required: true, 
        trim: true, 
        maxlength: 150 
    },
    description: { 
        type: String, 
        maxlength: 1000 
    },
    status: { 
        type: String, 
        enum: PROJECT_STATUSES, 
        default: 'active' 
    },
    startDate: { 
        type: Date 
    },
    endDate: { 
        type: Date 
    },
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
  },
  { 
    timestamps: true 
  }
);


export const Project = model<IProject>('Project', projectSchema);
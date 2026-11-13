import { Schema, model, Types } from 'mongoose';
import {  TASK_STATUSES, TaskStatus } from './enums';

export interface ITask {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: Types.ObjectId | null;
  dueDate?: Date | null;  
  completedAt?: Date | null;            
  createdBy: Types.ObjectId;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}



const taskSchema = new Schema<ITask>(
  {
    organizationId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Organization', 
        required: true 
    },

    projectId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },

    title: { 
        type: String, 
        required: true, 
        trim: true, 
        maxlength: 200 
    },
    description: { 
        type: String, 
        maxlength: 10000 
    },
    status: { 
        type: String, 
        enum: TASK_STATUSES, 
        default: 'todo' 
    },
    assigneeId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    },
    dueDate: { 
        type: Date 
    },
    completedAt: { 
        type: Date, 
        default: null 
    },
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    deletedAt: { 
        type: Date, 
        default: null 
    },
  },
  { 
    timestamps: true
   }
);


export const Task = model<ITask>('Task', taskSchema);
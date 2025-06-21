import mongoose, { Schema, Document, Model } from "mongoose";
import Company from "./Company";

// Interface for Designation Document
export interface IPermission extends Document {
  company: mongoose.Types.ObjectId;
  name: string;
  status: boolean;
  created_at: Date;
  updated_at: Date;
}

// Schema Definition
const PermissionSchema: Schema<IPermission> = new Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Company,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);
PermissionSchema.index({ name: 1, company: 1 }, { unique: true });
// Model Definition
const Permission: Model<IPermission> = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema
);

export default Permission;

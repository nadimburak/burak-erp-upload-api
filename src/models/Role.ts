import mongoose, { Schema, Document, Model } from "mongoose";
import Company from "./Company";
import Permission from "./Permission";

// Interface for Designation Document
export interface IRole extends Document {
    company: mongoose.Types.ObjectId;
    name: string;
    status: boolean;
    permissions: mongoose.Types.ObjectId[];
    created_at: Date;
    updated_at: Date;
}

// Schema Definition
const RoleSchema: Schema<IRole> = new Schema(
    {
        company: {
            type: Schema.Types.ObjectId,
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
        permissions: [{ type: Schema.Types.ObjectId, ref: Permission, required: false }],
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
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Mongoose will manage timestamps
    }
);

// Model Definition
const Role: Model<IRole> = mongoose.model<IRole>(
    "Role",
    RoleSchema
);

export default Role;
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUpload extends Document {
    file_name: string,
    file_path: string,
    file_url: string,
    file_original_name: string,
    file_extension: string,
    file_size: string,
    file_mime_type: string,
    file_disk: string,
    status: boolean;
    created_at: Date;
    updated_at: Date;
}

const UploadSchema: Schema<IUpload> = new Schema(
    {
        file_name: { type: String, required: true },
        file_path: { type: String, required: false },
        file_url: { type: String, required: false },
        file_original_name: { type: String, required: false },
        file_extension: { type: String, required: false },
        file_size: { type: String, required: false },
        file_mime_type: { type: String, required: false },
        file_disk: { type: String, required: false },
        status: {
            type: Boolean,
            required: false,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

const Upload: Model<IUpload> = mongoose.model<IUpload>(
    "Upload",
    UploadSchema
);

export default Upload;

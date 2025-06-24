import { Request, Response } from "express";
import { checkFileExists, combineChunks, startChunkProcess } from "../helpers/FileUploadHelper";
import { AuthRequest } from "../interfaces/Auth";
import Upload from "../models/upload";
import { TEMP_DIR, UPLOAD_DIR } from "../utils/file.util";
import path from "path";
import fs from 'fs-extra';

export const store = async (req: AuthRequest, res: Response) => {
    try {
        const {
            file_name,
            file_extension,
            file_size,
            file_mime_type,
        } = req.body;

        // console.log("req.body",req.body)
        // return;

        // Generate unique file name
        const fileName = await startChunkProcess()
        const filePath = `${fileName}.${file_extension}`;
        const fileUrl = `uploads/${fileName}.${file_extension}`;

        // Create upload record
        const upload = new Upload({
            file_name: fileName,
            file_original_name: file_name,
            file_extension: file_extension,
            file_size: file_size,
            file_mime_type: file_mime_type,
            file_path: filePath,
            file_disk: "local",
            file_url: fileUrl
        });

        await upload.save();

        res.status(200).json(upload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const storeChunk = async (req: Request, res: Response) => {
    try {
        const fileId = req.params.id;
        console.log("fileId", fileId)
        console.log("storeChunkreq", req)

        const offsetHeader = req.headers['upload-offset'];
        const lengthHeader = req.headers['upload-length'];
        const filename = req.headers['upload-name'];

        console.log("filename", filename)

        const offset = parseInt(Array.isArray(offsetHeader) ? offsetHeader[0] : offsetHeader || '0', 10);
        const length = parseInt(Array.isArray(lengthHeader) ? lengthHeader[0] : lengthHeader || '0', 10);

        // console.log("req.body", req.body)

        // Validate the request body
        if (!req.body || !Buffer.isBuffer(req.body)) {
            throw new Error('Invalid chunk data: body must be a Buffer');
        }

        const upload = await Upload.findOne({ file_path: fileId });
        if (!upload) {
            throw new Error('Upload record not found');
        }

        const folderName = upload.file_name;
        const chunkDir = path.join(__dirname, TEMP_DIR, folderName);

        if (!fs.existsSync(chunkDir)) {
            fs.mkdir(chunkDir, { recursive: true });
        }

        const chunkPath = path.join(chunkDir, `chunk_${offset}`);
        fs.writeFileSync(chunkPath, req.body);

        // Check if all chunks are uploaded
        if (offset + req.body.length >= length) {
            await combineChunks(chunkDir, folderName, path.join(chunkDir, '..'));
        }

        res.status(200).json('updated');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// DELETE /upload - Delete uploaded file
export const destroy = async (req: Request, res: Response) => {
    try {
        const id = req.body;
        const upload = await Upload.findOne({ file_path: id });

        if (upload) {
            // Delete local file
            if (fs.existsSync(upload.file_path)) {
                fs.unlinkSync(upload.file_path);
            }

            // Delete from database
            await upload.deleteOne();

            res.status(200).json({
                success: true,
                message: 'File deleted successfully'
            });
        }

        res.status(404).json({
            success: false,
            message: 'File not found'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /upload/load - Load file for FilePond restore
export const view = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const upload = await Upload.findOne({ file_path: id });
        if (!upload) {
            res.status(404).json({
                success: false,
                message: 'File not found'
            });
            return;
        }

        const filePath = path.join(UPLOAD_DIR, upload.file_path);
        console.log("filePath", filePath);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        res.setHeader('Content-Type', upload.file_mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${upload.file_original_name}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error: unknown) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: `File load failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
};

// GET /upload/loadAll - Load all files for specific criteria
export const index = async (req: Request, res: Response) => {
    try {

        const uploads = await Upload.find();

        res.status(200).json({
            success: true,
            uploads: uploads
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: `Failed to load files: ${error instanceof Error ? error.message : String(error)}`
        });
    }
};
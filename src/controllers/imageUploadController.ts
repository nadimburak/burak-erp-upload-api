import { Request, Response } from "express";
import fs from 'fs-extra';
import path from "path";
import {
    processChunkUploads,
    startChunkProcess
} from "../helpers/FileUploadHelper";
import Upload from "../models/upload";
import { UPLOAD_DIR } from "../utils/file.util";
import {
    validateChunkHeaders,
    validateUploadMetadata
} from "../validators/uploadValidator";

export const store = async (req: Request, res: Response) => {
    try {
        const { error } = await validateUploadMetadata(req.body);
        if (error) {
            res.status(400).json({ error: error.message });
            return;
        }

        const {
            file_name: originalName,
            file_extension: extension,
            file_size: size,
            file_mime_type: mimeType,
        } = req.body;

        const fileName = await startChunkProcess();
        const filePath = `${fileName}.${extension}`;
        const fileUrl = `/uploads/${filePath}`;

        const upload = new Upload({
            file_name: fileName,
            file_original_name: originalName,
            file_extension: extension,
            file_size: size,
            file_mime_type: mimeType,
            file_path: filePath,
            file_disk: "local",
            file_url: fileUrl
        });

        await upload.save();

        res.status(201).json(upload);
    } catch (error) {
        console.error('Upload initialization error:', error);
        res.status(500).json({ error: 'Failed to initialize upload' });
    }
};

export const storeChunk = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await validateChunkHeaders(req.headers);
        if (error) {
            res.status(400).json({ error: error.message });
            return;
        }

        const offset = parseInt(req.headers['upload-offset'] as string, 10);
        const length = parseInt(req.headers['upload-length'] as string, 10);
        const filename = req.headers['upload-name'] as string;

        await processChunkUploads({
            fileId: id,
            offset,
            length,
            filename,
            chunkData: req.file?.buffer || req.body
        });

        res.status(200).json({
            success: true,
            message: 'Chunk uploaded successfully',
            fileId: id,
            fileName: filename,
            offset: offset + (req.file?.buffer?.length || 0)
        });

        // res.set('Upload-Offset', String(offset + (req.file?.buffer?.length || 0))).json({
        //     success: true,
        //     message: 'Chunk uploaded successfully'
        // });
    } catch (error) {
        console.error('Chunk upload error:', error);
        const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        res.status(status).json({
            success: false,
            message: error instanceof Error ? error.message : 'Chunk upload failed'
        });
    }
};

export const destroy = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const upload = await Upload.findOneAndDelete({ file_path: id });

        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }

        const filePath = path.join(UPLOAD_DIR, upload.file_path);
        if (await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
        }

        res.status(200).json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

export const view = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const upload = await Upload.findOne({ file_path: id });

        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }

        res.status(200).json(upload);
    } catch (error) {
        console.error('File view error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load file'
        });
    }
};

export const load = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const upload = await Upload.findOne({ file_path: id });

        if (!upload) {
            res.status(404).json({ success: false, message: 'File not found' });
            return;
        }

        const filePath = path.join(UPLOAD_DIR, upload.file_path);
        if (!await fs.pathExists(filePath)) {
            res.status(404).json({ success: false, message: 'File not found on server' });
            return;
        }

        res.set({
            'Content-Type': upload.file_mime_type,
            'Content-Disposition': `inline; filename="${upload.file_original_name}"`,
            'Content-Length': upload.file_size
        });

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('File view error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load file'
        });
    }
};

export const index = async (req: Request, res: Response) => {
    try {
        const uploads = await Upload.find().select('-__v').lean();
        res.status(200).json({ success: true, uploads });
    } catch (error) {
        console.error('File list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load files'
        });
    }
};
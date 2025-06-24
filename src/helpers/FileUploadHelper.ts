import type { WriteStream } from 'fs';
import Upload from "../models/upload";
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { TEMP_DIR, UPLOAD_DIR } from '../utils/file.util';

export interface GenerateFileInput {
    originalname: string;
}

export const generateFile = (file: GenerateFileInput): string => {
    const extension: string = path.extname(file.originalname);
    const fileName: string = crypto.randomBytes(10).toString('hex') + extension;
    return fileName;
}

export interface GenerateFilePathOptions {
    title: string;
    directory?: string;
    extension?: string;
}

export const generateFilePath = (
    title: string,
    directory: string = 'pdf',
    extension: string = 'pdf'
): string => {
    // Sanitize the title
    const sanitizedTitle = title.replace(/[^\w\-]/g, '_');
    const timestamp = Date.now();
    return `${directory}/${sanitizedTitle}_${timestamp}.${extension}`;
}

export interface UpdateDataParams {
    originalname: string;
    size: number;
    mimetype: string;
}

export interface UpdateDataResult {
    file_name: string;
    file_path: string;
    file_url: string;
    file_original_name: string;
    file_extension: string;
    file_size: number;
    file_mime_type: string;
    file_disk: string;
    save: () => Promise<void>;
}

export const updateData = async (
    file: UpdateDataParams,
    fileName: string,
    filePath: string,
    fileUrl: string,
    disk: string = "local",
): Promise<UpdateDataResult> => {
    const upload = new Upload({
        file_name: fileName,
        file_path: filePath,
        file_url: fileUrl,
        file_original_name: file.originalname,
        file_extension: path.extname(file.originalname).substring(1),
        file_size: file.size,
        file_mime_type: file.mimetype,
        file_disk: disk,
    });

    const savedUpload = await upload.save();
    // Ensure file_size is a number
    if (typeof savedUpload.file_size === 'string') {
        savedUpload.file_size = parseInt(savedUpload.file_size, 10).toString();
    }
    return savedUpload as unknown as UpdateDataResult;
}

export interface SimpleUploadFile {
    originalname: string;
    buffer: Buffer;
}

export const simpleUpload = (file: SimpleUploadFile): string => {
    const folder = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const uploadPath = path.join(__dirname, UPLOAD_DIR, folder);

    if (!fs.exists(uploadPath)) {
        fs.mkdir(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, file.originalname);
    fs.writeFileSync(filePath, file.buffer);
    return folder;
}

export const startChunkProcess = async () => {
    const maxAttempts = 5;
    let attempt = 0;
    let folderName;

    // Ensure temp directory exists
    await fs.ensureDir(TEMP_DIR);

    do {
        folderName = crypto.randomBytes(10).toString('hex');
        const folderPath = path.join(TEMP_DIR, folderName);
        attempt++;

        try {
            // Use mkdir instead of mkdirSync to avoid race conditions
            await fs.mkdir(folderPath);
            return folderName;
        } catch (err) {
            if (!(err && typeof err === 'object' && 'code' in err && (err as any).code === 'EEXIST')) throw err; // Only ignore "already exists" errors
        }
    } while (attempt < maxAttempts);

    throw new Error('Failed to create unique directory after multiple attempts');
}

export interface ProcessChunkUploadsRequest {
    headers: {
        [key: string]: string | undefined;
        'upload-offset': string;
        'upload-length': string;
        'upload-name': string;
    };
    body: Buffer;
}

export const processChunkUploads = async (
    req: ProcessChunkUploadsRequest,
    id: string
): Promise<boolean> => {
    const offset = parseInt(req.headers['upload-offset'] || '0');
    const length = parseInt(req.headers['upload-length'] || '0');
    const filename = req.headers['upload-name'];

    // Validate the request body
    if (!req.body || !Buffer.isBuffer(req.body)) {
        throw new Error('Invalid chunk data: body must be a Buffer');
    }

    const upload = await Upload.findOne({ file_path: id });
    if (!upload) {
        throw new Error('Upload record not found');
    }

    const folderName = upload.file_name;
    const chunkDir = path.join(__dirname, TEMP_DIR, folderName);

    if (!fs.exists(chunkDir)) {
        fs.mkdir(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk_${offset}`);
    fs.writeFileSync(chunkPath, req.body);

    // Check if all chunks are uploaded
    if (offset + req.body.length >= length) {
        await combineChunks(chunkDir, folderName, path.join(chunkDir, '..'));
    }

    return true;
};

export interface CombineChunksParams {
    chunkDir: string;
    uniqueId: string;
    parentDir: string;
}

export const combineChunks = async (
    chunkDir: string,
    uniqueId: string,
    parentDir: string
): Promise<void> => {
    try {
        const upload = await Upload.findOne({ file_name: uniqueId });
        if (!upload) throw new Error('Upload record not found');

        const finalFileName = `${upload.file_name}.${upload.file_extension}`;
        const finalFilePath = path.join(UPLOAD_DIR, finalFileName);

        await fs.ensureDir(UPLOAD_DIR);

        const chunkFiles = fs.readdirSync(chunkDir)
            .filter(file => file.startsWith('chunk_'))
            .sort((a, b) => {
                const aNum = parseInt(a.split('_')[1]);
                const bNum = parseInt(b.split('_')[1]);
                return aNum - bNum;
            });

        const writeStream = fs.createWriteStream(finalFilePath);
        
        for (const chunkFile of chunkFiles) {
            const chunkPath = path.join(chunkDir, chunkFile);
            const chunkData = await fs.readFile(chunkPath);
            writeStream.write(chunkData);
            await fs.unlink(chunkPath);
        }

        writeStream.end();
        
        // Wait for write stream to finish
        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', (err) => reject(err));
        });

        upload.file_url = `/uploads/${finalFileName}`;
        await upload.save();

        await fs.rm(chunkDir, { recursive: true });
        try {
            await fs.rmdir(parentDir);
        } catch (err) {
            // Ignore non-empty directory error
        }
    } catch (error) {
        console.error('Error combining chunks:', error);
        throw error; // Re-throw for controller to handle
    }
};

export const checkFileExists = async (file_path: any) => {
    try {
        const filePath = path.join(UPLOAD_DIR, file_path);
        await fs.access(filePath, fs.constants.F_OK);
        console.log("✅ File exists:", filePath);
        return true;
    } catch (err: any) {
        console.error("❌ File does NOT exist:", err.message);
        return false;
    }
}



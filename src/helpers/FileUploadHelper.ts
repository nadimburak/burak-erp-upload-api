import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import stream from 'stream';
import Upload from "../models/upload";
import { TEMP_DIR, UPLOAD_DIR } from '../utils/file.util';

const pipeline = promisify(stream.pipeline);

export const startChunkProcess = async (): Promise<string> => {
    const maxAttempts = 5;
    let attempt = 0;
    let folderName: string;

    await fs.ensureDir(TEMP_DIR);

    do {
        folderName = crypto.randomBytes(10).toString('hex');
        const folderPath = path.join(TEMP_DIR, folderName);
        
        try {
            await fs.mkdir(folderPath);
            return folderName;
        } catch (err: any) {
            if (err.code !== 'EEXIST') throw err;
            attempt++;
        }
    } while (attempt < maxAttempts);

    throw new Error('Failed to create unique directory after multiple attempts');
};

interface ProcessChunkUploadsParams {
    fileId: string;
    offset: number;
    length: number;
    filename?: string;
    chunkData: Buffer;
}

export const processChunkUploads = async ({
    fileId,
    offset,
    length,
    filename,
    chunkData
}: ProcessChunkUploadsParams): Promise<void> => {
    const upload = await Upload.findOne({ file_path: fileId });
    if (!upload) throw new Error('Upload record not found');

    const chunkDir = path.join(TEMP_DIR, upload.file_name);
    await fs.ensureDir(chunkDir);

    const chunkPath = path.join(chunkDir, `chunk_${offset}`);
    await fs.writeFile(chunkPath, chunkData);

    if (offset + chunkData.length >= length) {
        await combineChunks({
            chunkDir,
            uploadId: upload._id,
            finalExtension: upload.file_extension
        });
    }
};

interface CombineChunksParams {
    chunkDir: string;
    uploadId: any;
    finalExtension: string;
}

export const combineChunks = async ({
    chunkDir,
    uploadId,
    finalExtension
}: CombineChunksParams): Promise<void> => {
    const upload = await Upload.findById(uploadId);
    if (!upload) throw new Error('Upload record not found');

    const finalFileName = `${upload.file_name}.${finalExtension}`;
    const finalFilePath = path.join(UPLOAD_DIR, finalFileName);
    await fs.ensureDir(UPLOAD_DIR);

    const chunkFiles = (await fs.readdir(chunkDir))
        .filter(file => file.startsWith('chunk_'))
        .sort((a, b) => {
            const aNum = parseInt(a.split('_')[1], 10);
            const bNum = parseInt(b.split('_')[1], 10);
            return aNum - bNum;
        });

    const writeStream = fs.createWriteStream(finalFilePath, { flags: 'a' });

    for (const chunkFile of chunkFiles) {
        const chunkPath = path.join(chunkDir, chunkFile);
        const readStream = fs.createReadStream(chunkPath);
        await pipeline(readStream, writeStream);
        await fs.unlink(chunkPath);
    }

    upload.file_url = `/uploads/${finalFileName}`;
    await upload.save();

    try {
        await fs.remove(chunkDir);
    } catch (err) {
        console.error('Error cleaning up chunk directory:', err);
    }
};

export const checkFileExists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(path.join(UPLOAD_DIR, filePath), fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};
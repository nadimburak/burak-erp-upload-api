// utils/path.util.ts
import path from 'path';
import { UPLOAD_DIR, TEMP_DIR } from './file.util';

export const getChunkDir = (folderName: string) => {
    return path.join(TEMP_DIR, folderName);
};

export const getFinalFilePath = (fileName: string, extension: string) => {
    return path.join(UPLOAD_DIR, `${fileName}.${extension}`);
};

export const getChunkPath = (chunkDir: string, offset: number) => {
    return path.join(chunkDir, `chunk_${offset}`);
};
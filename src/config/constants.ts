// File size limits
export const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

// Allowed file types
export const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
];

// Other constants
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_UPLOADS_PER_USER = 100;
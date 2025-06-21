import { Request } from "express";

export interface AuthRequest extends Request {
    user?: any;
    token?: string;
}

export const tokenBlacklist: Set<string> = new Set();

export interface IToken {
    _id: string;
    company_id: string;
}
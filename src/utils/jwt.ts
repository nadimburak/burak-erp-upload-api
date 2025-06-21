import jwt from 'jsonwebtoken';

export const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return secret;
}

export const generateToken = (userId: string) => {
    const secret = getSecret();
    return jwt.sign({ userId }, secret as string, { expiresIn: "100h" });
}

export const verifyToken = (token: string) => {
    const secret = getSecret();
    return jwt.verify(token, secret as string) as { userId: string };
}

export const decodeToken = (token: string) => {
    return jwt.decode(token);
}


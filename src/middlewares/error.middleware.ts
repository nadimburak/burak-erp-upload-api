import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    res.status(404).json({ message: 'Not Found' });
};
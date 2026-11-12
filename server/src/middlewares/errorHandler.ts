import {Request , Response, NextFunction} from 'express';
import {ApiError} from '../utils/ApiError.js'


export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = async(err: Error, _req:Request, res:Response, _next:NextFunction) =>{
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    const message = err instanceof ApiError ? err.message : 'Internal server Error';

    if(statusCode === 500) console.error(err);

    res.status(statusCode).json({
        success:false,
        message,
        ...(process.env.NODE_ENV !== "prodution" && {stack: err.stack} )
    })
}
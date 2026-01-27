import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

export interface AuthenticatedRequest extends Request {
    userId?: number | string;
}

export const authMiddleware = (req: AuthenticatedRequest, res:Response, next:NextFunction) => {
    const jwtToken = req.headers.authorization

    if (!jwtToken ||  typeof jwtToken !== "string") {
        return res.status(401).json({ message: "No token provided, access denied" });
    }

    try {
        const verify = jwt.verify(jwtToken, process.env.JWT_SECRET!) as JwtPayload
        req.userId = verify.userId;    
        return next();
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired token" });
    }
}
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";

export const userRouter = Router();

userRouter.get("/", authMiddleware, (req, res) => {
    res.json({
        message:"hi there"
    })
})
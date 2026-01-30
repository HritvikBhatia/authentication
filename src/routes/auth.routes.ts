import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Router } from "express";
import { Request, Response } from "express";

import { forgotPasswordSchema, signupSchema } from "../schemas/user.schemas";
import { prisma } from "../lib/prisma";
import { transporter } from "../lib/mail";

export const authRouter = Router();

authRouter.post("/signup", async (req: Request, res: Response) => {
  const parseData = signupSchema.safeParse(req.body);

  if (!parseData.success) {
    res.json({
      message: "incorrect formate",
    });
    return;
  }

  const { username, email, password } = parseData.data;

  try {
    const hashPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashPassword,
      },
    });

    await prisma.token.deleteMany({
      where: {
        userId: user.id,
      },
    });

    const emailToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(emailToken).digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.token.create({
      data: {
        tokenHash,
        type: "EMAIL_VERIFY",
        expiresAt,
        userId: user.id,
      },
    });

    const verifyUrl = `http://localhost:3000/api/v1/auth/verify-email/${emailToken}`;

    const info = await transporter.sendMail({
      from: `"vik authentication" ${process.env.SENDER_EMAIL}`,
      to: email,
      subject: "Verify your email",
      html: `
            <p>Welcome, ${username}!</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>This link expires in 15 minutes.</p>
        `,
    });

    console.log("Message sent:", info.messageId);

    res.status(201).json({
      message: "User created. Please verify your email.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Signup failed" });
  }
});


authRouter.get("/verify-email/:token", async (req: Request, res: Response) => {
  try {
    const rawToken = req.params.token;

    if (Array.isArray(rawToken)) {
      return res.status(400).json({ message: "Invalid token" });
    }


    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const token = await prisma.token.findFirst({
      where: {
        tokenHash,
        type: "EMAIL_VERIFY",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return res.status(400).json({
        message: "Invalid or expired verification link",
      });
    }

    const user = await prisma.user.update({
      where: { id: token.userId },
      data: { verify: true },
    });

    await prisma.token.update({
      where: { id: token.id },
      data: { used: true },
    });

    const jwtToken = jwt.sign({
      userId: user.id,
      userEmail: user.email
    },process.env.JWT_SECRET!)

    res.json({ 
      token: jwtToken,
      message: "Email verified successfully" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});


authRouter.get("/forgotPassword", async (req: Request, res: Response) => {
  try {
    const parseData = forgotPasswordSchema.safeParse(req.body);
    
    if (!parseData.success) {
      res.json({
        message: "incorrect formate",
      });
      return;
    }

    const { email } = parseData.data;
    
    const user = await prisma.user.findFirst({
      where:{
        email
      }
    })

    if(!user){
      return res.status(404).json({
        message: "User not found, check email again",
      });
    }

    const emailToken = crypto.randomUUID();
    const tokenHash = crypto.createHash("sha256").update(emailToken).digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.token.create({
      data: {
        tokenHash,
        type: "PASSWORD_RESET",
        expiresAt,
        userId: user.id,
      },
    });

    const resetUrl = `http://localhost:3000/api/v1/auth/reset-password/${emailToken}`;

    const info = await transporter.sendMail({
      from: `"vik authentication" ${process.env.SENDER_EMAIL}`,
      to: email,
      subject: "Verify your email",
      html: `
            <p>Welcome, ${user.username}!</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>This link expires in 15 minutes.</p>
        `,
    });

    console.log("Message sent:", info.messageId);

    res.status(201).json({
      message: "Email send. Please verify your email.",
    });


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password reset failed" });
  }
})

authRouter.post("/reset-password/:token", async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password required" });
    }

    const rawToken = req.params.token
    
    if (Array.isArray(rawToken)) {
      return res.status(400).json({ message: "Invalid token" });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const token = await prisma.token.findFirst({
      where: {
        tokenHash,
        type: "PASSWORD_RESET",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: token.userId },
      data: { password: hashedPassword },
    });

    await prisma.token.update({
      where: { id: token.id },
      data: { used: true },
    });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reset failed" });
  }
  
})
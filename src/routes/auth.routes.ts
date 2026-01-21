import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response } from "express";
import { Router } from "express";

import { signupSchema } from "../schemas/user.schemas";
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

    const verifyUrl = `http://localhost:3000/verify-email?token=${emailToken}`;

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

    await prisma.user.update({
      where: { id: token.userId },
      data: { verify: true },
    });

    await prisma.token.update({
      where: { id: token.id },
      data: { used: true },
    });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
});

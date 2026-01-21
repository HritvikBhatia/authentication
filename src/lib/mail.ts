import nodemailer from "nodemailer";
import "dotenv/config";


export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log({
  host: process.env.SMTP_HOST,
  user: process.env.SMTP_USER,
  passLength: process.env.SMTP_PASS?.length,
});


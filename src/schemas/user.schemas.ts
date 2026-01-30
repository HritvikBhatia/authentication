import z, { email } from "zod"

export const signupSchema = z.object({
    username: z.string().min(3),
    email: z.email(),
    password: z.string().min(4)
})

export type SignupSchema = z.infer<typeof signupSchema>;


export const forgotPasswordSchema = z.object({
    email: z.email()
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema >
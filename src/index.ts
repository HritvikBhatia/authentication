import express  from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";

const app = express()

app.use(express.json());
app.use(cors());

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/user", userRouter)

app.listen(3000, () => {
    console.log("Server is running on port 3000");
})
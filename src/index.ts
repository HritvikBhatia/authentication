import express  from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";

const app = express()

app.use(express.json());
app.use(cors());

app.use("/api/v1/auth", authRouter)

app.listen(3000, () => {
    console.log("Server is running on port 3000");
})
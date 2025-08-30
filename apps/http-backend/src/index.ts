import dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import cors from "cors";

const app: Express = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

/* Routes Import */
import userRouter from "./routes/users.routes";
import roomRouter from "./routes/room.routes";

/* Routes Deceleration */
app.use("/api/v1/user", userRouter);
app.use("/api/v1/room", roomRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is listening on PORT: ${PORT}`);
});
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

/* Starting Server */
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server is listening on PORT: ${PORT}`);
});

/* Graceful Shutdown of Server */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('Server shutdown successfully!')
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('Server shutdown successfully!')
  });
});
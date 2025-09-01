import { Router } from "express";
import { createRoom } from "../controllers/room.controller";
import { authUser } from "../middlewares/auth.middleware";

const router: Router = Router();

router.post('/create', authUser, createRoom);

export default router;
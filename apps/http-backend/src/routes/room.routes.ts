import { Router } from "express";
import { authUser } from "../middlewares/auth.middleware";
import { createRoom, joinRoom, deleteRoom, addShape, modifyShape, deleteShape } from "../controllers/room.controller";

const router: Router = Router();

router.post('/create', authUser, createRoom);

router.get('/join/:roomId', authUser, joinRoom);

router.delete('/delete', authUser, deleteRoom);

router.post('/add-shape', authUser, addShape);

router.put('/modify-shape', authUser, modifyShape);

router.delete('/delete-shape', authUser, deleteShape);


export default router;
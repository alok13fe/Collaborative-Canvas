import { Router } from "express";
import { registerUser, loginUser, google, userProfile } from "../controllers/user.controller";
import { authUser } from "../middlewares/auth.middleware";

const router: Router = Router();

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/google', google);

router.get('/profile', authUser, userProfile);


export default router;
import { Router } from "express";
import { registerUser, loginUser, google, userProfile, uploadImage } from "../controllers/user.controller";
import { authUser } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";

const router: Router = Router();

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/google', google);

router.get('/profile', authUser, userProfile);

router.post('/upload-image', upload.single('image'), uploadImage);


export default router;
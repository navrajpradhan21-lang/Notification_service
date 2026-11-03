import express from "express";
import { createNotificationController,getNotificationController } from "../controllers/notification.controller.js";
import { devAuth } from "../middleware/devAuth.middleware.js";


const router = express.Router();

router.post("/", devAuth,createNotificationController);
router.get("/",devAuth, getNotificationController);

export default router;
import express from "express";
import { createNotificationController,getNotificationController, markNotificationAsReadController, unreadCountController } from "../controllers/notification.controller.js";
import { devAuth } from "../middleware/devAuth.middleware.js";


const router = express.Router();

router.post("/", devAuth,createNotificationController);
router.get("/",devAuth, getNotificationController);
router.patch("/:id/read",devAuth,markNotificationAsReadController);
router.get("/unread-count",devAuth,unreadCountController);


export default router;
import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { Outbox } from "../models/outbox.model.js";


export const createNotificationController = async (req, res, next) => {
  let session;

  try {
    session = await mongoose.startSession();
    const data = req.body;
    let notification;

    await session.withTransaction(async () => {
      const created = await Notification.create(
        [{
          ...data,
          status: data.channel === "IN_APP" ? "SENT" : "PENDING",
          sentAt: data.channel === "IN_APP" ? new Date() : null,
        }],
        { session }
      );

      notification = created[0];

      // Save an email event in the same transaction as the notification.
      if (data.channel === "EMAIL") {
        await Outbox.create(
          [{
            eventType: "SEND_EMAIL",
            payload: {
              notificationId: notification._id.toString(),
            },
          }],
          { session }
        );
      }
    });

    return res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    // If this request used an idempotency key that already exists,
    // return the existing notification.
    if (error.code === 11000 && req.body.idempotencyKey) {
      try {
        const existingNotification = await Notification.findOne({
          recipient: req.body.recipient,
          idempotencyKey: req.body.idempotencyKey,
        });

        if (existingNotification) {
          return res.status(200).json({
            success: true,
            notification: existingNotification,
          });
        }
      } catch (lookupError) {
        return next(lookupError);
      }
    }

    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const getNotificationController = async(req,res,next)=>{
    try{
        const userId = req.user.id;
        const rawPage = Number(req.query.page ?? 1);
        const rawLimit = Number(req.query.limit ?? 10);
        const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
        const skip = (page - 1) * limit;
        const [notifications,total] = await Promise.all([
            Notification.find({recipient:userId})
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit)
            .lean(),

        Notification.countDocuments({recipient:userId}),
        ])
        const result = {notifications,pagination:{total,page,limit,totalPages:Math.ceil(total/limit)}}
        return res.status(200).json({
            success:true,
            result
        });

    }catch(error){
        next(error)
    }
}

export const markNotificationAsReadController = async (req,res,next)=>{
    try{
        const notificationId = req.params.id
        const userId = req.user.id

        const notification = await Notification.findOneAndUpdate(
            {
                _id:notificationId,
                recipient:userId
            },
            {
                $set:{isRead:true}
            },
            {
                new: true,
                runValidators: true,
            }
        );
        if(!notification){
            return res.status(404).json({
                success:false,
                message:"Notification not found"
            });
        }
        return res.status(200).json({
            success:true,
            message:"Notication marked as read",
            notification
        })

    }catch(error){
        next(error)
    }
}

export const unreadCountController = async (req, res, next) => {
  try {
    const userId = req.user.id

    const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });

  } catch (error) {
    next(error);
  }
};

    
     

       
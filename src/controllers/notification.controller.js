import { Notification } from "../models/notification.model.js";
import { notification as notificationQueue } from "../queues/notification.queue.js";

export const createNotificationController = async (req, res, next) =>{
    try{
        const data = req.body;
        let notification;

        try{
            notification = await Notification.create({
            ...data,
            status:data.channel==="IN_APP"?"SENT":"PENDING",
            sentAt:data.channel === "IN_APP"?new Date():null,
        });

        }catch(error){
            // If the idempoyency key already exists,return its notification
            if(error.code === 11000 && data.idempotencyKey){
                const existingNotification = await Notification.findOne({
                recipient: data.recipient,
                idempotencyKey: data.idempotencyKey,
                });

                if(existingNotification){
                    return res.status(200).json({
                        success:true,
                        notification:existingNotification
                    });
                }
            }
            throw error; 
        }
        // Queue email only after creating a new notification.
       
        if(data.channel === "EMAIL"){
            await notificationQueue.add("send-notification",
                {notificationId:notification._id.toString()},
                {jobId:`notification-${notification._id}`}
            );
        }

        return res.status(201).json({
            success:true,
            notification,
        }); 
        //job.data contains notificationId 
        //job.id is the id of the job

    }catch(error){
        next(error)
    }        
};

export const getNotificationController = async(req,res,next)=>{
    try{
        const userId = req.user.id;
        const {page=1,limit =10} = req.query;
        const skip = (page-1)*limit;
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

    
     

       
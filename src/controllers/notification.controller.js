import { Notification } from "../models/notification.model.js";

export const createNotificationController = async (req, res, next) =>{
    try{
        const {
        recipient,
        type,
        channel,
        title,
        message,
        data,
        } = req.body;

        const notification = await Notification.create({
            recipient,
            type,
            channel,
            title,
            message,
            data})
        return res.status(200).json({
                success: true,
                message: "Notification created successfully",
                notification
            })    

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


    
     

       
import { configDotenv } from "dotenv"

configDotenv();

import connectDb from "../config/db.js";
import { Outbox } from "../models/outbox.model.js";
import { notification as notificationQueue } from "../queues/notification.queue.js";

const sleep = async(ms)=>{
    new Promise((resolve)=>setTimeout(resolve,ms))
}

const publishEvent = async()=>{
    while(true){
        try{
            const event = await Outbox.findOneAndUpdate(
                {$or:[
                    {status:"PENDING"},
                    {
                        status:"PROCESSING",
                        lockedAt:{$lt:new Date(Date.now()-60000)},
                    },
                ]},
                {
                    $set:{
                        status:"PROCESSING",
                        lockedAt: new Date(),
                    },
                },
                {
                    new:true,
                    sort:{createdAt:1}
                }

            );
            if(!event){
                await sleep(2000);
                continue;
            }

            if(event.eventType ==='SEND_EMAIL'){
                const {notificationId} = event.payload;

                await notificationQueue.add(
                    "send-email",
                    {notificationId},
                    {jobId:`notification-${notificationId}`}
                )
            }
            await Outbox.findByIdAndUpdate(event._id,{
                status:'PROCESSED',
                lockedAt:null,
            });
            console.log("Outbox event published:", event._id);
        }catch(error){
            console.error("Outbox publisher error:",error.message);
            await sleep(2000)
        }
    }
};

const startPublisher = async () => {
  await connectDb();

  console.log("Outbox Publisher Started");

  await publishEvent();
};

startPublisher().catch(console.error);
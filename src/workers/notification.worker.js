//background worker (Consumer)
//Now comes the interesting part.

//The worker continuously listens to the Redis queue. Whenever a job becomes available, 
// it picks it up and executes the processing function.
import { configDotenv } from "dotenv";
import { Worker } from "bullmq";
import redis from "../config/redis.js";
import { Notification } from "../models/notification.model.js";
import connectDB from "../config/db.js";

configDotenv();

const startWorker = async()=>{
    await connectDB();

    const worker = new Worker(  // Creates a queue consumer
        "notification-queue",// queue name must match
        async(job)=>{
            try{
                const {notificationId} = job.data; //Retrieves data sent by producer
                console.log("Processing notification:",notificationId);

                //Fetches notification from MongoDB
                const notification = await Notification.findById(notificationId)

                if(!notification){
                    throw new Error("Notification not found");
                }
                //Adding a delay Simulating email sending
                console.log("Sending email...");
                await new Promise((resolve)=>setTimeout(resolve,2000));

                // Updating notification status
                notification.status = "SENT";
                notification.sentAt = new Date();

                await notification.save();
                console.log("Notification send successfully");

            }catch(error){
                console.log("Notification failed:", error.message);
                throw error; // BullMQ will retry the job
            }

        },
        {
            connection:redis,
            concurrency:5,
        }
    );

    worker.on("completed",(job)=>{
        console.log(`Job ${job.id} completed`)
    });
    worker.on("failed",(job,error)=>{
        console.log(`Job ${job?.id} failed:`,error.message);
    });
    console.log("Notification Worker Started");
}

startWorker().catch(console.error);
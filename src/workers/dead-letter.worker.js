import { configDotenv } from "dotenv";
configDotenv();

import { Worker } from "bullmq";
import redis from "../config/redis.js";
import connectDB from "../config/db.js";

const startWorker = async()=>{
    await connectDB();
    const worker = new Worker(
        "dead-letter-queue",
        async(job)=>{
            console.log("Permanently failed notification:");
            console.log(job.data);
            // For now we only insepct failed Job 
            // Later , we can implement manual replay.
        },
        {
            connection:redis,
            concurrency:1,
        }

    );
    worker.on("completed",(job)=>{
        console.log("DLQ job inspected:",job.id);
    });
 
    worker.on("failed",(job,error)=>{
        console.log("DLQ processing error:",error.message);
    });
    console.log("Dead letter Worker Started");
};
startWorker().catch(console.error)
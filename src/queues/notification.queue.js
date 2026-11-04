// Producer
// Add a job to the queue

import { Queue } from "bullmq";
import redis from "../config/redis.js";

export const notification = new Queue(
    "notification-queue", // Queue name
    {
        connection:redis,
        defaultJobOptions:{
            attempts:3, // max attemp 3
            
            backoff:{
                type:"exponential",
                delay:2000, //Retry delays grow exponentially: 1st failure 2 sec 2nd fslier 4 sec ....
            },
            removeOnComplete:{
                count:1000, //Keeps the most recent 1,000 completed jobs and removes older completed jobs.
            },
            removeOnFail:false,//Keeps failed jobs for debugging and inspection.
        },
    }
);
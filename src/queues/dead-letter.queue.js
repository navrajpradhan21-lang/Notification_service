import { Queue } from "bullmq";
import redis from "../config/redis.js";

export const deadLetterQueue = new Queue("dead-letter-queue",
    {
        connection:redis,
    }
);
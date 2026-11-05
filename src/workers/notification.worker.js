//background worker (Consumer)
//Now comes the interesting part.

//The worker continuously listens to the Redis queue. Whenever a job becomes available, 
// it picks it up and executes the processing function.
import { configDotenv } from "dotenv";
import { Worker } from "bullmq";
import redis from "../config/redis.js";
import { Notification } from "../models/notification.model.js";
import connectDB from "../config/db.js";
import { sendNotificationEmail } from "../services/email.service.js";
import { deadLetterQueue } from "../queues/dead-letter.queue.js";
import { User } from "../models/user.model.js";
import { notification } from "../queues/notification.queue.js";

configDotenv();

const startWorker = async () => {
    await connectDB();

    const worker = new Worker(  // Creates a queue consumer
        "notification-queue",// queue name must match
        async (job) => {
            const { notificationId } = job.data; //Retrieves data sent by producer
            try {

                console.log("Processing notification:", notificationId);

                //Fetches notification from MongoDB
                const notification = await Notification.findById(notificationId)

                if (!notification) {
                    throw new Error("Notification not found");
                }
                // Avoid processing an already sent notification
                if (notification.status === "SENT") {
                    return;
                }
                // changing the status from PENDING to PROCESSING 

                notification.status = "PROCESSING";
                await notification.save();

                // Finding the recipient email
                const recipient = await User.findById(notification.recipient).select("email");
                if (!recipient?.email) {
                    throw new Error("Recipent email not found")
                }
                // Send actual email
                await sendNotificationEmail({
                    to: recipient.email,
                    subject: notification.title,
                    message: notification.message,
                });

                // Updating notification status
                notification.status = "SENT";
                notification.sentAt = new Date();

                await notification.save();
                console.log("Notification send successfully");

            } catch (error) {
                console.log("Notification failed:", error.message);
                await Notification.findByIdAndUpdate(notificationId, { status: "PENDING" });

                throw error; // BullMQ will retry the job
            }

        },
        {
            connection: redis,
            concurrency: 5,
        }
    );

    worker.on("completed", (job) => {
        console.log(`Job ${job.id} completed`)
    });
    worker.on("failed", async (job, error) => {
        console.log(`Job ${job?.id} failed:`, error.message);

        // Check whether the job has exhausted its configured retry attempts (defaults to 1).
        if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
            try {
                // Mark Notification as failed
                await Notification.findByIdAndUpdate(
                    job.data.notificationId,
                    { status: "FAILED" }
                );
                // Move job informatiom into DLQ
                await deadLetterQueue.add("failed-notification",{
                    originalJobId:job.id,
                    notificationId:job.data.notificationId,
                    error:error.mesasge,
                    failedAt:new Date().toISOString(),
                });
                console.log("Job moved to Dead Letter Queue");
            }catch(dlqError){
                console.log("Failed to moved job to DLQ:",dlqError)
            }
        }
    });

    console.log("Notification Worker Started");
}

startWorker().catch(console.error);
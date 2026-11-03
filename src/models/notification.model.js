import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({

    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["LIKE",
            "COMMENT",
            "FOLLOW",
            "ORDER_UPDATE",
            "PASSWORD_RESET",],
        required: true,
    },
    channel: {
      type: String,
      enum: ["EMAIL", "IN_APP"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
        type: String,
        enum: ["PENDING", "PROCESSING", "SENT", "FAILED"],
        default: "PENDING",
    },
    isRead:{
        type:Boolean,
        default:false,
    }

},{timestamps:true})


/*notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  isRead: 1,
});*/


export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);
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
    },
      sentAt: {
      type: Date,
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: null,
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

// Adding a unique Partial index
notificationSchema.index(
  {
    recipient:1,
    idempotencyKey:1
  },
  {
    unique:true,
    partialFilterExpression:{
      idempotencyKey:{$type:"string"},
    },
  }
);
// The above lines tells us that 
// when a notification has a string idempotency key, that key must be unique.
//  This helps prevent duplicate notifications when the same request is retried.

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);
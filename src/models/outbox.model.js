import mongoose from "mongoose";

const outboxSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "PROCESSED"],
      default: "PENDING",
    },

    lockedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

outboxSchema.index({ status: 1, createdAt: 1 });

export const Outbox = mongoose.model("Outbox", outboxSchema);
import { Notification } from "../models/notification.model.js";

export const createNotification = async (data) => {
  const notification = await Notification.create(data);

  return notification;
};

export const getUserNotifications = async (
  userId,
  page = 1,
  limit = 10
) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments({ recipient: userId }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markNotificationAsRead = async (
  notificationId,
  userId
) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    {
      $set: { isRead: true },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return notification;
};

export const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
};
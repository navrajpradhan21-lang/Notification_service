
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockStartSession = jest.fn();
const mockNotificationCreate = jest.fn();
const mockNotificationFindOne = jest.fn();
const mockNotificationFind = jest.fn();
const mockNotificationCountDocuments = jest.fn();
const mockNotificationFindOneAndUpdate = jest.fn();
const mockOutboxCreate = jest.fn();

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: mockStartSession,
  },
}));

jest.unstable_mockModule("../../models/notification.model.js", () => ({
  Notification: {
    create: mockNotificationCreate,
    findOne: mockNotificationFindOne,
    find: mockNotificationFind,
    countDocuments: mockNotificationCountDocuments,
    findOneAndUpdate: mockNotificationFindOneAndUpdate,
  },
}));

jest.unstable_mockModule("../../models/outbox.model.js", () => ({
  Outbox: {
    create: mockOutboxCreate,
  },
}));

const { default: mongoose } = await import("mongoose");
const { Notification } = await import("../../models/notification.model.js");
const { Outbox } = await import("../../models/outbox.model.js");
const { createNotificationController } = await import("../../controllers/notification.controller.js");

describe("createNotificationController", () => {
  let req;
  let res;
  let next;
  let session;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        recipient: "user123",
        channel: "EMAIL",
        type: "ORDER_UPDATE",
        title: "Order update",
        message: "Your order is shipped",
        idempotencyKey: "key-123",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    mongoose.startSession.mockResolvedValue(session);
  });

  test("should create an email notification and outbox event", async () => {
    const fakeNotification = {
      _id: "notification123",
      ...req.body,
      status: "PENDING",
    };

    Notification.create.mockResolvedValue([fakeNotification]);
    Outbox.create.mockResolvedValue([]);

    await createNotificationController(req, res, next);

    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(Outbox.create).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      notification: fakeNotification,
    });

    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test("should create an in-app notification without an outbox event", async () => {
    req.body.channel = "IN_APP";

    const fakeNotification = {
      _id: "notification456",
      ...req.body,
      status: "SENT",
    };

    Notification.create.mockResolvedValue([fakeNotification]);

    await createNotificationController(req, res, next);

    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(Outbox.create).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should return existing notification for duplicate idempotency key", async () => {
    const duplicateError = { code: 11000 };

    const existingNotification = {
      _id: "existing123",
      ...req.body,
    };

    Notification.create.mockRejectedValue(duplicateError);
    Notification.findOne.mockResolvedValue(existingNotification);

    await createNotificationController(req, res, next);

    expect(Notification.findOne).toHaveBeenCalledWith({
      recipient: req.body.recipient,
      idempotencyKey: req.body.idempotencyKey,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      notification: existingNotification,
    });

    expect(Outbox.create).not.toHaveBeenCalled();
  });

  test("should pass transaction errors to error middleware", async () => {
    const error = new Error("Database failure");

    session.withTransaction.mockRejectedValue(error);

    await createNotificationController(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test("should fetch paginated notifications for the authenticated user", async () => {
    const user = { id: "user-456" };
    const notifications = [{ _id: "n1", recipient: user.id, title: "Test" }];
    const queryMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(notifications),
    };

    mockNotificationFind.mockReturnValue(queryMock);
    mockNotificationCountDocuments.mockResolvedValue(1);

    const { getNotificationController } = await import("../../controllers/notification.controller.js");

    const reqWithUser = { user, query: { page: "2", limit: "5" } };

    await getNotificationController(reqWithUser, res, next);

    expect(mockNotificationFind).toHaveBeenCalledWith({ recipient: user.id });
    expect(queryMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(queryMock.skip).toHaveBeenCalledWith(5);
    expect(queryMock.limit).toHaveBeenCalledWith(5);
    expect(queryMock.lean).toHaveBeenCalledTimes(1);
    expect(mockNotificationCountDocuments).toHaveBeenCalledWith({ recipient: user.id });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      result: {
        notifications,
        pagination: { total: 1, page: 2, limit: 5, totalPages: 1 },
      },
    });
  });

  test("should mark a notification as read for the correct user", async () => {
    const reqWithUser = {
      user: { id: "user-789" },
      params: { id: "notification-123" },
    };
    const updatedNotification = { _id: "notification-123", recipient: "user-789", isRead: true };

    mockNotificationFindOneAndUpdate.mockResolvedValue(updatedNotification);

    const { markNotificationAsReadController } = await import("../../controllers/notification.controller.js");

    await markNotificationAsReadController(reqWithUser, res, next);

    expect(mockNotificationFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "notification-123", recipient: "user-789" },
      { $set: { isRead: true } },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Notication marked as read",
      notification: updatedNotification,
    });
  });

  test("should return 404 when marking a missing notification as read", async () => {
    const reqWithUser = {
      user: { id: "user-789" },
      params: { id: "notification-404" },
    };

    mockNotificationFindOneAndUpdate.mockResolvedValue(null);

    const { markNotificationAsReadController } = await import("../../controllers/notification.controller.js");

    await markNotificationAsReadController(reqWithUser, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Notification not found",
    });
  });

  test("should return unread notification count for the authenticated user", async () => {
    const reqWithUser = { user: { id: "user-321" } };

    mockNotificationCountDocuments.mockResolvedValue(7);

    const { unreadCountController } = await import("../../controllers/notification.controller.js");

    await unreadCountController(reqWithUser, res, next);

    expect(mockNotificationCountDocuments).toHaveBeenCalledWith({
      recipient: "user-321",
      isRead: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      unreadCount: 7,
    });
  });
});






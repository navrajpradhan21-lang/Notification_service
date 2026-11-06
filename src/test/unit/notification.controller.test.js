
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const mockStartSession = jest.fn();
const mockNotificationCreate = jest.fn();
const mockNotificationFindOne = jest.fn();
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
});






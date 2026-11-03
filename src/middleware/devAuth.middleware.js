
export const devAuth = (req, res, next) => {
  // Development only.
  // Replace this with verified JWT authentication.

  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User ID required",
    });
  }

  req.user = {
    id: userId,
  };

  next();
};
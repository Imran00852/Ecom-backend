import { User } from "../models/user";
import ErrorHandler from "../utils/utility-class";
import { TryCatch } from "./error";

export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;
  if (!id) return next(new ErrorHandler("Login first!", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("No user found!", 404));

  if (user.role !== "admin") {
    return next(new ErrorHandler("Only Admin can access!", 403));
  }
  next();
});

import { NextFunction, Request, Response } from "express";
import { User } from "../models/user";
import { NewUserReqBody } from "../types/types";
import ErrorHandler from "../utils/utility-class";
import { TryCatch } from "../middlewares/error";

export const newUser = TryCatch(
  async (
    req: Request<{}, {}, NewUserReqBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, email, photo, gender, _id, dob } = req.body;
    let user = await User.findById(_id);
    if (user) {
      return res.status(200).json({
        success: true,
        message: `Welcome ${user.name}`,
        user,
      });
    }

    if (!name || !email || !photo || !gender || !_id || !dob)
      return next(new ErrorHandler("Please add all fields", 400));

    user = await User.create({
      name,
      photo,
      email,
      gender,
      _id,
      dob: new Date(dob),
    });

    return res.status(201).json({
      success: true,
      message: `Welcome ${user.name}`,
    });
  }
);

export const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await User.find({});

  return res.status(200).json({
    success: true,
    users,
  });
});

export const getUser = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid Id", 400));

  return res.status(200).json({
    success: true,
    user,
  });
});

export const deleteUser = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid Id", 400));

  await user.deleteOne();
  return res.status(200).json({
    success: true,
    message: "User deleted successfully!",
  });
});

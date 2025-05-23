import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/utility-class";
// import { ControllerType } from "../types/types";

export const errorMiddleware = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let message = err.message || "Internal server error";
  const statusCode = err.statusCode || 500;

  if (err.name === "CastError") message = "Invalid Id";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export const TryCatch =
  (func: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    func(req, res, next).catch(next);
  };

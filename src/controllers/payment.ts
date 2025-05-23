import { stripe } from "../app";
import { TryCatch } from "../middlewares/error";
import { Coupon } from "../models/coupon";
import ErrorHandler from "../utils/utility-class";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount) return next(new ErrorHandler("Please enter amount", 400));

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "inr",
  });

  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export const newCoupon = TryCatch(async (req, res, next) => {
  const { code, amount } = req.body;

  if (!code || !amount) {
    return next(new ErrorHandler("Coupon and Amount fields are required", 400));
  }

  let couponCode = await Coupon.findOne({ code });
  if (couponCode) {
    return next(new ErrorHandler("Coupon code already exists!", 400));
  }

  await Coupon.create({
    code,
    amount,
  });

  return res.status(201).json({
    success: true,
    message: `coupon code ${code} created successfully`,
  });
});

export const applyDiscount = TryCatch(async (req, res, next) => {
  const { code } = req.query;

  const discount = await Coupon.findOne({ code });

  if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));

  return res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

export const getAllCouponCodes = TryCatch(async (req, res, next) => {
  const coupons = await Coupon.find({});

  if (!coupons) return next(new ErrorHandler("No coupons found", 404));

  return res.status(200).json({
    success: true,
    coupons,
  });
});

export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  if (!id) return next(new ErrorHandler("Id is required", 400));

  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Coupon not found", 404));

  await coupon.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Coupon deleted successfully",
  });
});

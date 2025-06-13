import { stripe } from "../app";
import { TryCatch } from "../middlewares/error";
import { Coupon } from "../models/coupon";
import { Product } from "../models/product";
import { User } from "../models/user";
import { OrderItemType, ShippingInfoType } from "../types/types";
import ErrorHandler from "../utils/utility-class";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  const user = await User.findById(id).select("name");

  if (!user) return next(new ErrorHandler("Please login first", 401));

  const {
    items,
    shippingInfo,
    coupon,
  }: {
    items: OrderItemType[];
    shippingInfo: ShippingInfoType | undefined;
    coupon: string | undefined;
  } = req.body;

  if (!items) return next(new ErrorHandler("Please send items", 400));

  if (!shippingInfo)
    return next(new ErrorHandler("Please send shipping info", 400));

  let discountAmount = 0;

  if (coupon) {
    const discount = await Coupon.findOne({ code: coupon });
    if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));
    discountAmount = discount.amount;
  }

  const productIDs = items.map((item) => item.productId);

  const products = await Product.find({
    _id: { $in: productIDs },
  });

  const subtotal = products.reduce((prev, curr) => {
    const item = items.find((i) => i.productId === curr._id.toString());
    if (!item) return prev;
    return curr.price * item.quantity + prev;
  }, 0);

  const tax = subtotal * 0.18;

  const shipping = subtotal > 1000 ? 0 : 200;

  const total = Math.floor(subtotal + tax + shipping - discountAmount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: total * 100,
    currency: "usd",
    description: "MERN-Ecommerce",
    shipping: {
      name: user.name,
      address: {
        line1: shippingInfo.address,
        postal_code: shippingInfo.pinCode.toString(),
        city: shippingInfo.city,
        state: shippingInfo.state,
        country: shippingInfo.country,
      },
    },
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

export const updateCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { code, amount } = req.body;

  if (!id) return next(new ErrorHandler("Id is required", 400));

  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Coupon not found", 404));

  if (code) coupon.code = code;

  if (amount) coupon.amount = amount;

  await coupon.save();

  return res.status(200).json({
    success: true,
    message: "Coupon updated successfully",
  });
});

export const getSingleCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  if (!id) return next(new ErrorHandler("Id is required", 400));

  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Coupon not found", 404));

  return res.status(200).json({
    success: true,
    coupon,
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

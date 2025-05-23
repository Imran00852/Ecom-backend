import { Request } from "express";
import { TryCatch } from "../middlewares/error";
import { NewOrderReqBody } from "../types/types";
import { Order } from "../models/order";
import { invalidatesCache, reduceStock } from "../utils/features";
import ErrorHandler from "../utils/utility-class";
import { myCache } from "../app";

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderReqBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    if (
      !shippingInfo ||
      !orderItems ||
      !user ||
      !subtotal ||
      !tax ||
      !shippingCharges ||
      !discount ||
      !total
    ) {
      return next(new ErrorHandler("All fields are required", 400));
    }
    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      total,
    });

    await reduceStock(orderItems);
    invalidatesCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
    });
  }
);

export const myOrders = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  let orders = [];
  if (myCache.has(`my-orders-${id}`))
    orders = JSON.parse(myCache.get(`my-orders-${id}`)!);
  else {
    orders = await Order.find({ user: id });
    myCache.set(`my-orders-${id}`, JSON.stringify(orders));
  }

  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  let orders = [];
  if (myCache.has(`all-orders`))
    orders = JSON.parse(myCache.get(`all-orders`)!);
  else {
    orders = await Order.find({}).populate("user", "name");
    myCache.set(`all-orders`, JSON.stringify(orders));
  }

  return res.status(200).json({
    success: true,
    orders,
  });
});

//order details
export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  let order;

  if (myCache.has(`order-${id}`))
    order = JSON.parse(myCache.get(`order-${id}`)!);
  else {
    order = await Order.findById(id).populate("user", "name");
    if (!order) return next(new ErrorHandler("Order not found", 404));
    myCache.set(`order-${id}`, JSON.stringify(order));
  }

  return res.status(200).json({
    success: true,
    order,
  });
});

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order not found", 404));

  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  invalidatesCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order processed successfully",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order not found", 404));

  await order.deleteOne();

  invalidatesCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});

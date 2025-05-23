import express from "express";
import { adminOnly } from "../middlewares/auth";
import {
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  getAllCouponCodes,
  newCoupon,
} from "../controllers/payment";

const app = express.Router();

//payment gateway
app.post("/create", createPaymentIntent);

app.post("/coupon/new", adminOnly, newCoupon);
app.get("/apply", applyDiscount);
app.get("/coupon/all", adminOnly, getAllCouponCodes);

app.delete("/coupon/:id", adminOnly, deleteCoupon);

export default app;

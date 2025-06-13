import express from "express";
import { adminOnly } from "../middlewares/auth";
import {
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  getAllCouponCodes,
  getSingleCoupon,
  newCoupon,
  updateCoupon,
} from "../controllers/payment";

const app = express.Router();

//payment gateway
app.post("/create", createPaymentIntent);

app.post("/coupon/new", adminOnly, newCoupon);
app.get("/apply", applyDiscount);
app.get("/coupon/all", adminOnly, getAllCouponCodes);

app
  .route("/coupon/:id")
  .get(adminOnly, getSingleCoupon)
  .delete(adminOnly, deleteCoupon)
  .put(adminOnly, updateCoupon);

export default app;

import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import { config } from "dotenv";
import express, { Request, Response } from "express";
import Stripe from "stripe";
import { errorMiddleware } from "./middlewares/error";
import { connectDB, connectRedis } from "./utils/features";

import orderRoutes from "./routes/order";
import paymentRoutes from "./routes/payment";
import productRoutes from "./routes/product";
import dashboardRoutes from "./routes/stats";
import userRoutes from "./routes/user";

config({
  path: "./.env",
});

const port = process.env.PORT;
const mongo_uri = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";
const redis_uri = process.env.REDIS_URI || "";
const redis_token = process.env.REDIS_TOKEN || "";
export const redisTTL = Number(process.env.REDIS_TTL) || 60 * 60 * 4;

connectDB(mongo_uri);
export const redis = connectRedis({url:redis_uri,token:redis_token});
export const stripe = new Stripe(stripeKey);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [process.env.FRONTEND_URI as string],
  })
);

//routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

//home route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Home route!" });
});

//use static files
app.use("/uploads", express.static("uploads"));

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});

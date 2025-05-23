import express, { Request, Response } from "express";
import { config } from "dotenv";
import { connectDB } from "./utils/features";
import { errorMiddleware } from "./middlewares/error";
import NodeCache from "node-cache";
import Stripe from "stripe";
import cors from "cors";

import userRoutes from "./routes/user";
import productRoutes from "./routes/product";
import orderRoutes from "./routes/order";
import paymentRoutes from "./routes/payment";
import dashboardRoutes from "./routes/stats";

config({
  path: "./.env",
});

const port = process.env.PORT;
const mongo_uri = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";

connectDB(mongo_uri);
export const myCache = new NodeCache();
export const stripe = new Stripe(stripeKey);

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

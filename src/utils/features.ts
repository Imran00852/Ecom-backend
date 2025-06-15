import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Redis } from "ioredis";
import mongoose, { Document, Types } from "mongoose";
import { redis } from "../app";
import { Product } from "../models/product";
import { Review } from "../models/review";
import { InvalidateCacheProps, OrderItemType } from "../types/types";

export const findAverageRating = async (productId: Types.ObjectId) => {
  let totalRating = 0;
  const reviews = await Review.find({ product: productId });
  reviews.forEach((review) => {
    totalRating += review.rating;
  });

  const averageRating = Math.floor(totalRating / reviews.length) || 0;

  return { ratings: averageRating, numOfReviews: reviews.length };
};

const getBase64 = (file: Express.Multer.File) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

export const uploadToCloudinary = async (files: Express.Multer.File[]) => {
  const promises = files.map(async (file) => {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload(getBase64(file), (error, result) => {
        if (error) return reject(error);
        resolve(result!);
      });
    });
  });
  const result = await Promise.all(promises);
  return result.map((i) => ({
    public_id: i.public_id,
    url: i.secure_url,
  }));
};

export const deleteFromCloudinary = async (publicIds: string[]) => {
  const promises = publicIds.map((id) => {
    return new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(id, (error, result) => {
        if (error) return reject(error);
        resolve();
      });
    });
  });
  await Promise.all(promises);
};

export const connectRedis = ({url:string,token:string}) => {
  const redis = new Redis({url,token});
  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (e) => console.log(e));

  return redis;
};

export const connectDB = async (uri: string) => {
  await mongoose
    .connect(uri, {
      dbName: "Ecommerce",
    })
    .then((c) => {
      console.log(`connected to DB on host ${c.connection.host}`);
    })
    .catch((err) => console.log(err));
};

export const invalidatesCache = async ({
  product,
  review,
  order,
  admin,
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (review) {
    await redis.del(`reviews-${productId}`);
  }

  if (product) {
    const productKeys: string[] = [
      "all-products",
      "categories",
      "latest-products",
      `product-${productId}`,
    ];

    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId === "object")
      productKeys.forEach((i) => productKeys.push(`product-${i}`));

    await redis.del(productKeys);
  }
  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];

    await redis.del(orderKeys);
  }
  if (admin) {
    await redis.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
  }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const order = orderItems[i];

    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product not found");
    product.stock -= order.quantity;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = (thisMonth / lastMonth) * 100;

  return Number(percent.toFixed(0));
};

export const getInventories = async ({
  categories,
  productsCount,
}: {
  categories: string[];
  productsCount: number;
}) => {
  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category })
  );

  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: Record<string, number>[] = [];

  categories.forEach((category, idx) => {
    categoryCount.push({
      [category]: Math.round((categoriesCount[idx] / productsCount) * 100),
    });
  });

  return categoryCount;
};

interface MyDocument extends Document {
  createdAt: Date;
  discount?: number;
  total?: number;
}

type getChartDataProps = {
  length: number;
  docArr: MyDocument[];
  today: Date;
  property?: "discount" | "total";
};

export const getChartData = ({
  length,
  docArr,
  today,
  property,
}: getChartDataProps) => {
  const data: number[] = new Array(length).fill(0);

  docArr.forEach((i) => {
    const creationDate = i.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

    if (monthDiff < length) {
      data[length - monthDiff - 1] += property ? i[property]! : 1;
    }
  });

  return data;
};

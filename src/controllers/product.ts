import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error";
import {
  BaseQuery,
  NewProductReqBody,
  SearchRequestQuery,
} from "../types/types";
import { Product } from "../models/product";
import ErrorHandler from "../utils/utility-class";
import { rm } from "fs";
import { myCache } from "../app";
import { invalidatesCache } from "../utils/features";

export const newProduct = TryCatch(
  async (
    req: Request<{}, {}, NewProductReqBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, category, price, stock } = req.body;
    const photo = req.file;
    if (!photo) return next(new ErrorHandler("Photo is required", 400));

    if (!name || !price || !stock || !category) {
      rm(photo.path, () => {
        console.log("Deleted");
      });
      return next(new ErrorHandler("All fields are required", 400));
    }

    await Product.create({
      name,
      price,
      stock,
      category: category.toLowerCase(),
      photo: photo?.path,
    });

    invalidatesCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product created susccessfully!",
    });
  }
);

export const getLatestProducts = TryCatch(async (req, res, next) => {
  let products;

  if (myCache.has("latest-products")) {
    products = JSON.parse(myCache.get("latest-products")!);
  } else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    //caching
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;
  if (myCache.has("categories")) {
    categories = JSON.parse(myCache.get("categories")!);
  } else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;
  if (myCache.has("all-products")) {
    products = JSON.parse(myCache.get("all-products")!);
  } else {
    products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  let product;
  if (myCache.has(`product-${id}`)) {
    product = JSON.parse(myCache.get(`product-${id}`)!);
  } else {
    product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Invalid Id", 404));
    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

export const updateSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const { name, category, price, stock } = req.body;
  const photo = req.file;

  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Invalid Id", 404));

  if (photo) {
    rm(product.photo!, () => {
      console.log("Old Photo Deleted");
    });
    product.photo = photo.path;
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;

  await product.save();

  invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product updated susccessfully!",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Invalid Id", 404));

  rm(product.photo!, () => {
    console.log("Product photo deleted");
  });

  await product.deleteOne();

  invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product deleted successfully!",
  });
});

export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { search, sort, price, category } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);

    const baseQuery: BaseQuery = {};

    if (search) {
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };
    }

    if (price) {
      baseQuery.price = {
        $lte: Number(price),
      };
    }

    if (category) {
      baseQuery.category = category;
    }

    const [products, filteredProducts] = await Promise.all([
      Product.find(baseQuery)
        .sort(sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit)
        .skip(skip),
      Product.find(baseQuery),
    ]);

    const totalPages = Math.ceil(filteredProducts.length / limit);
    return res.status(200).json({
      success: true,
      products,
      totalPages,
    });
  }
);

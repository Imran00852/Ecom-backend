import { NextFunction, Request, Response } from "express";
import { redis, redisTTL } from "../app";
import { TryCatch } from "../middlewares/error";
import { Product } from "../models/product";
import { Review } from "../models/review";
import { User } from "../models/user";
import {
  BaseQuery,
  NewProductReqBody,
  SearchRequestQuery,
} from "../types/types";
import {
  deleteFromCloudinary,
  findAverageRating,
  invalidatesCache,
  uploadToCloudinary,
} from "../utils/features";
import ErrorHandler from "../utils/utility-class";

export const newProduct = TryCatch(
  async (
    req: Request<{}, {}, NewProductReqBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, category, price, stock, description } = req.body;
    const photos = req.files as Express.Multer.File[] | undefined;

    if (!photos) return next(new ErrorHandler("Photos are required", 400));

    if (photos.length < 1)
      return next(new ErrorHandler("Please add at least one photo", 400));

    if (photos.length > 5)
      return next(new ErrorHandler("You can upload max 5 photos", 400));

    if (!name || !price || !stock || !category || !description) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    //upload to cloudinary
    const photosURL = await uploadToCloudinary(photos);

    await Product.create({
      name,
      price,
      stock,
      description,
      category: category.toLowerCase(),
      photos: photosURL,
    });

    await invalidatesCache({ product: true, admin: true });

    return res.status(201).json({
      success: true,
      message: "Product created susccessfully!",
    });
  }
);

export const getLatestProducts = TryCatch(async (req, res, next) => {
  let products;
  products = await redis.get("latest-products");

  if (products) {
    products = JSON.parse(products);
  } else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
    //caching
    await redis.setex("latest-products",redisTTL, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const getAllCategories = TryCatch(async (req, res, next) => {
  let categories;
  categories = await redis.get("categories");
  if (categories) {
    categories = JSON.parse(categories);
  } else {
    categories = await Product.distinct("category");
    await redis.setex("categories",redisTTL, JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {
  let products;
  products = await redis.get("all-products");
  if (products) {
    products = JSON.parse(products);
  } else {
    products = await Product.find({});
    await redis.setex("all-products",redisTTL, JSON.stringify(products));
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
  product = await redis.get(`product-${id}`);
  if (product) {
    product = JSON.parse(product);
  } else {
    product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Invalid Id", 404));
    await redis.setex(`product-${id}`,redisTTL, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

export const updateSingleProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const { name, category, price, stock, description } = req.body;
  const photos = req.files as Express.Multer.File[];

  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Invalid Id", 404));

  if (photos && photos.length > 0) {
    const photosUrl = await uploadToCloudinary(photos);
    const ids = product.photos.map((i) => i.public_id);
    await deleteFromCloudinary(ids);
    product.photos = photosUrl as any;
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;
  if (description) product.description = description;

  await product.save();

  await invalidatesCache({
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

  const ids = product.photos.map((i) => i.public_id);

  await deleteFromCloudinary(ids);

  await product.deleteOne();

  await invalidatesCache({
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
    const key = `product-${search}-${sort}-${price}-${category}-${page}`;

    let products;
    let totalPages;

    const cachedData = await redis.get(key);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      totalPages = data.totalPages;
      products = data.products;
    } else {
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

      const [productsFetched, filteredProducts] = await Promise.all([
        Product.find(baseQuery)
          .sort(sort && { price: sort === "asc" ? 1 : -1 })
          .limit(limit)
          .skip(skip),
        Product.find(baseQuery),
      ]);

      products = productsFetched;

      totalPages = Math.ceil(filteredProducts.length / limit);
      await redis.setex(key, 30, JSON.stringify({ products, totalPages }));
    }
    return res.status(200).json({
      success: true,
      products,
      totalPages,
    });
  }
);

//review controllers
export const newReview = TryCatch(async (req, res, next) => {
  const { id } = req.params; //product id
  const { comment, rating } = req.body;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const user = await User.findById(req.query.id);
  if (!user) return next(new ErrorHandler("Not Logged In", 400));

  const product = await Product.findById(id);
  if (!product) return next(new ErrorHandler("Invalid Id", 404));

  const alreadyReviewed = await Review.findOne({
    user: user._id,
    product: product._id,
  });

  if (alreadyReviewed) {
    alreadyReviewed.comment = comment;
    alreadyReviewed.rating = rating;
    await alreadyReviewed.save();
  } else {
    await Review.create({
      comment,
      rating,
      user: user._id,
      product: product._id,
    });
  }

  const { ratings, numOfReviews } = await findAverageRating(product._id);
  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  await invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
    review: true,
  });

  return res.status(201).json({
    success: true,
    message: alreadyReviewed
      ? "Review updated successfully!"
      : "Review added successfully!",
  });
});

export const deleteReview = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Id is required", 400));

  const user = await User.findById(req.query.id);
  if (!user) return next(new ErrorHandler("Not Logged In", 400));

  const review = await Review.findById(id);
  if (!review) return next(new ErrorHandler("Review not found", 404));

  const isAuthenticUser = review.user.toString() === user._id.toString();

  if (!isAuthenticUser) return next(new ErrorHandler("Not authorized", 401));

  await review.deleteOne();

  const product = await Product.findById(review.product);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  const { ratings, numOfReviews } = await findAverageRating(product._id);
  product.ratings = ratings;
  product.numOfReviews = numOfReviews;

  await product.save();

  await invalidatesCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(201).json({
    success: true,
    message: "Review deleted successfully!",
  });
});

export const allReviewsOfAProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params; //product id
  if (!id) return next(new ErrorHandler("Id is required", 400));

  let reviews;
  reviews = await redis.get(`reviews-${id}`);

  if (reviews) {
    reviews = JSON.parse(reviews);
  } else {
    reviews = await Review.find({ product: id })
      .populate("user", "name photo")
      .sort({ updatedAt: -1 });

    await redis.setex(`reviews-${id}`,redisTTL, JSON.stringify(reviews));
  }
  return res.status(200).json({
    success: true,
    reviews,
  });
});

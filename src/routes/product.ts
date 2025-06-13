import express from "express";

import {
  allReviewsOfAProduct,
  deleteProduct,
  deleteReview,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getLatestProducts,
  getSingleProduct,
  newProduct,
  newReview,
  updateSingleProduct,
} from "../controllers/product";
import { adminOnly } from "../middlewares/auth";
import { multipleUpload } from "../middlewares/multer";

const app = express.Router();

app.post("/new", adminOnly, multipleUpload, newProduct);

app.get("/latest", getLatestProducts);

app.get("/all", getAllProducts);

app.get("/categories", getAllCategories);

app.get("/admin-products", adminOnly, getAdminProducts);

app
  .route("/:id")
  .get(getSingleProduct)
  .put(adminOnly, multipleUpload, updateSingleProduct)
  .delete(adminOnly, deleteProduct);

app.get("/review/:id", allReviewsOfAProduct);
app.post("/review/new/:id", newReview);
app.delete("/review/:id", deleteReview);

export default app;

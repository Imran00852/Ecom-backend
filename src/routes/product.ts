import express from "express";

import { adminOnly } from "../middlewares/auth";
import {
  deleteProduct,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getLatestProducts,
  getSingleProduct,
  newProduct,
  updateSingleProduct,
} from "../controllers/product";
import { singleUpload } from "../middlewares/multer";

const app = express.Router();

app.post("/new", adminOnly, singleUpload, newProduct);

app.get("/latest", getLatestProducts);

app.get("/all", getAllProducts);

app.get("/categories", getAllCategories);

app.get("/admin-products", adminOnly, getAdminProducts);

app
  .route("/:id")
  .get(getSingleProduct)
  .put(adminOnly, singleUpload, updateSingleProduct)
  .delete(adminOnly, deleteProduct);

export default app;

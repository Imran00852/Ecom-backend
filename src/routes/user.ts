import express from "express";
import { deleteUser, getAllUsers, getUser, newUser } from "../controllers/user";
import { adminOnly } from "../middlewares/auth";

const app = express.Router();

app.post("/new", newUser);
app.get("/all", adminOnly, getAllUsers);
app.route("/:id").get(getUser).delete(adminOnly, deleteUser);

export default app;

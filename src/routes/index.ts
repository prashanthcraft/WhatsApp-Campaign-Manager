import express from "express";
import { signup } from "../api/auth/authController";
import { createBuildInfoEndpoint } from "build-genie";
export default function () {
  const routes = express.Router();
  routes.use("/auth", require("@api/auth"));
  routes.get("/version", createBuildInfoEndpoint("./dist/build-info.json"));
  return routes;
}

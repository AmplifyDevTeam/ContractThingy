import { handle } from "hono/vercel";
import { createApp } from "./app";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

/** Bundled to api/index.js for Vercel Node serverless. */
export default handle(createApp());

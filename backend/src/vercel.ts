import { handle } from "hono/vercel";
import { createApp } from "./app";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

export default handle(createApp());

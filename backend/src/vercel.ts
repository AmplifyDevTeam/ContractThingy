import { handle } from "hono/vercel";
import { createApp } from "./app";

export const runtime = "nodejs";
export const maxDuration = 60;

export default handle(createApp());

import { httpRouter } from "convex/server";
import { retellWebhook } from "./retellWebhooks";

const http = httpRouter();

http.route({
  path: "/retell/webhook",
  method: "POST",
  handler: retellWebhook,
});

export default http;

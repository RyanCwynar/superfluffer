import { httpRouter } from "convex/server";
import { retellWebhook } from "./retellWebhooks";
import { bookAppointmentHandler } from "./retellFunctions";

const http = httpRouter();

http.route({
  path: "/retell/webhook",
  method: "POST",
  handler: retellWebhook,
});

http.route({
  path: "/retell/book-appointment",
  method: "POST",
  handler: bookAppointmentHandler,
});

export default http;

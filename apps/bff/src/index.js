import http from "node:http";
import { BFF_PORT } from "./config.js";
import { sendJson } from "./http.js";
import { handleAuthRoutes } from "./routes/auth.js";

const server = http.createServer(async (request, response) => {
  try {
    const handled = await handleAuthRoutes(request, response);

    if (handled) {
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: "BFF service is running"
    });
  } catch (error) {
    sendJson(response, 500, {
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error"
    });
  }
});

server.listen(BFF_PORT, () => {
  console.log(`BFF server listening on http://127.0.0.1:${BFF_PORT}`);
});

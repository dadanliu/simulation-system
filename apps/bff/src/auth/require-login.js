import { getCurrentUser } from "./get-current-user.js";
import { sendJson } from "../http.js";

export function requireLogin(request, response) {
  const user = getCurrentUser(request);

  if (!user) {
    sendJson(response, 401, {
      success: false,
      message: "Unauthorized"
    });

    return null;
  }

  return user;
}

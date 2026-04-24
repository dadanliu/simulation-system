export async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function sendJson(response, statusCode, data, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });

  response.end(JSON.stringify(data));
}

export function sendNotFound(response) {
  sendJson(response, 404, {
    success: false,
    message: "Not Found"
  });
}

export function sendMethodNotAllowed(response, method) {
  sendJson(response, 405, {
    success: false,
    message: `Method ${method} Not Allowed`
  });
}

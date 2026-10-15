// Public endpoints are called from customers' websites, so allow any origin.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Conversation-Id",
};

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

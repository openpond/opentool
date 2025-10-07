/**
 * Wraps a Web Standard handler function for Lambda execution
 * Used by the build system to convert user's exported functions
 *
 * User writes:
 *   export async function POST(request: Request) { ... }
 *
 * Build system converts to:
 *   export const POST = wrapHandler(userPOST);
 */
export function wrapHandler(
  handler: (request: Request) => Promise<Response>
) {
  return async (event: any) => {
    try {
      // Convert Lambda event to Web Standard Request
      const url = new URL(
        event.rawPath || event.path || "/",
        `https://${event.headers?.host || "localhost"}`
      );

      // Add query parameters
      if (event.rawQueryString) {
        url.search = event.rawQueryString;
      } else if (event.queryStringParameters) {
        Object.entries(event.queryStringParameters).forEach(
          ([key, value]) => {
            url.searchParams.append(key, value as string);
          }
        );
      }

      // Build headers
      const headers = new Headers();
      Object.entries(event.headers || {}).forEach(([key, value]) => {
        headers.set(key, value as string);
      });

      // Create Request object
      const request = new Request(url, {
        method:
          event.requestContext?.http?.method || event.httpMethod || "GET",
        headers,
        body: event.body || undefined,
      });

      // Execute handler (returns Web Standard Response)
      const response = await handler(request);

      // Convert Response to Lambda format
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: await response.text(),
      };
    } catch (error: any) {
      // Handle errors
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message || "Internal server error",
        }),
      };
    }
  };
}

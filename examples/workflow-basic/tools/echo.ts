export const metadata = {
  name: "echo",
  description: "Echo back the request body",
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  return Response.json({ ok: true, payload });
}

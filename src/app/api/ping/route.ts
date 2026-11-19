export async function GET() {
  return Response.json({ pong: true, env: process.env.NODE_ENV, backend: process.env.DATA_BACKEND });
}

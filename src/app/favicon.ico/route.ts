export const dynamic = 'force-static';

export async function GET(request: Request) {
  return Response.redirect(new URL('/icon.svg', request.url), 308);
}

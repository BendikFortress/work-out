export { auth as proxy } from "@/auth";

export const config = {
  // Only protect page routes — API routes authenticate themselves inside each handler.
  matcher: [
    "/((?!login|register|api/|_next/static|_next/image|favicon.ico).*)",
  ],
};

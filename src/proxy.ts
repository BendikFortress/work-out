export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Protect all routes except auth pages, api/auth, api/register, and Next.js internals
    "/((?!login|register|api/auth|api/register|_next/static|_next/image|favicon.ico).*)",
  ],
};

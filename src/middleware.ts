import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isApiRoute = createRouteMatcher(["/api(.*)"]);
// /up is the Kamal healthcheck
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/up"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  if (isApiRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  // Redirects signed-out visitors to /sign-in
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};

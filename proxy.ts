import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { SESSION_COOKIE_NAME } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { applyPageSecurityHeaders } from "@/lib/security";
import type { SessionPayload } from "@/lib/types";

function authSecret() {
  return new TextEncoder().encode(serverEnv.AUTH_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

function finalizeProxyResponse(
  request: NextRequest,
  response: NextResponse,
) {
  applyPageSecurityHeaders(request, response.headers);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await verifyToken(sessionToken) : null;

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return finalizeProxyResponse(
        request,
        NextResponse.redirect(new URL("/auth/login", request.url)),
      );
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return finalizeProxyResponse(
        request,
        NextResponse.redirect(new URL("/auth/login", request.url)),
      );
    }

    if (session.role !== "admin") {
      return finalizeProxyResponse(
        request,
        NextResponse.redirect(new URL("/dashboard", request.url)),
      );
    }
  }

  if (
    pathname.startsWith("/auth") &&
    session &&
    !pathname.startsWith("/auth/onboarding") &&
    !pathname.startsWith("/auth/forgot-password") &&
    !pathname.startsWith("/auth/reset-password")
  ) {
    return finalizeProxyResponse(
      request,
      NextResponse.redirect(
        new URL(session.role === "admin" ? "/admin" : "/dashboard", request.url),
      ),
    );
  }

  return finalizeProxyResponse(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};

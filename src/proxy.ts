import { NextResponse, type NextRequest } from "next/server";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

type SessionData = {
  userId?: string;
  email?: string;
  role?: string;
};

function getSessionOptions(): SessionOptions {
  return {
    cookieName: "magic_session",
    password: process.env.SESSION_SECRET || "",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  const needsAuth = path.startsWith("/editor");
  const isLogin = path === "/login";

  if (!needsAuth && !isLogin) {
    return NextResponse.next();
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return NextResponse.next();
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );

  if (needsAuth && !session.userId) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("next", path + url.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && session.userId) {
    return NextResponse.redirect(new URL("/editor", url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/editor/:path*", "/login"],
};

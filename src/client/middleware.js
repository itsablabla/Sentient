import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "sentient_session";

export function middleware(request) {
	const { pathname } = request.nextUrl;
	const cookieStore = request.cookies;
	const hasSession = cookieStore.has(SESSION_COOKIE_NAME);

	// Redirect the root path to the chat page
	if (pathname === "/") {
		const url = request.nextUrl.clone();
		url.pathname = "/chat";
		return NextResponse.redirect(url);
	}

	// If user is on login page and has session, redirect to chat
	if (pathname.startsWith("/auth/login") && hasSession) {
		const url = request.nextUrl.clone();
		url.pathname = "/chat";
		return NextResponse.redirect(url);
	}

	// If user is not on login page (and not in public assets checking done by config matcher)
	// and does not have session, redirect to login
	if (!pathname.startsWith("/auth") && !hasSession) {
		const url = request.nextUrl.clone();
		url.pathname = "/auth/login";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico, sitemap.xml, robots.txt (metadata files)
		 * - api (API routes)
		 * - PWA files (manifest, icons, service worker, workbox)
		 * - .png and .svg files (static images)
		 */
		"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|manifest.json|manifest.webmanifest|sw.js|workbox-.*\\.js$|.*\\.png$|.*\\.svg$).*)",
	],
};

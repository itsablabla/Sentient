import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function GET(request) {
    await logout();
    // Redirect to login page after logout
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
}

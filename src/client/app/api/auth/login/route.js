import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request) {
    try {
        const body = await request.json();
        const { token } = body;

        // Validate token against environment variable
        // We check both SELF_HOST_AUTH_TOKEN (client env) and SELF_HOST_AUTH_SECRET (server env concept, but usually same in simple setups)
        // Actually, in the client (Next.js server side), we should use SELF_HOST_AUTH_TOKEN as defined in .env
        const validToken = process.env.SELF_HOST_AUTH_TOKEN;

        if (!validToken) {
            console.error("SELF_HOST_AUTH_TOKEN is not set in environment.");
            return NextResponse.json(
                { error: "Server misconfiguration: Auth token not set." },
                { status: 500 }
            );
        }

        if (token !== validToken) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        await login(token);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

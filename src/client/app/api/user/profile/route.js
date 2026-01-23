// src/client/app/api/user/profile/route.js
import { NextResponse } from "next/server"


export async function GET() {
	return NextResponse.json(
		{
			sub: "sentient-user",
			given_name: "Admin",
			name: "Sentient Admin",
			picture: "/images/half-logo-dark.svg",
		},
		{
			headers: { "Cache-Control": "no-store, max-age=0" },
		}
	);
}


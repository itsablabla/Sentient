"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            if (res.ok) {
                router.push("/chat");
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white selection:bg-neutral-700">
            <div className="w-full max-w-md space-y-8 px-4">
                <div className="flex flex-col items-center p-8 text-center">
                    {/* Using a placeholder or text if logo not available, 
                assuming public/logo.png might exist or just text for now to be safe */}
                    <h1 className="text-4xl font-bold tracking-tighter text-white/90 font-geist">
                        SENTIENT
                    </h1>
                    <p className="mt-2 text-sm text-neutral-400">
                        Enter your access token to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <input
                            type="password"
                            placeholder="Access Token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-500 shadow-sm transition-colors focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Authenticating..." : "Enter"}
                    </button>
                </form>
            </div>
        </div>
    );
}

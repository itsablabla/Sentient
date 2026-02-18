// src/client/lib/auth0.js
// DEPRECATED: This file now re-exports from supabase.js for backward compatibility.
// Any code still importing from "@lib/auth0" will continue to work.
import { supabase, getBackendAuthHeader } from "./supabase"

// The `auth0` object is replaced by `supabase` — but many files import `auth0` directly.
// For files that use auth0.getSession() or auth0.getAccessToken(), they'll need updating.
// This export exists ONLY so the import path doesn't break during migration.
export const auth0 = supabase
export { getBackendAuthHeader }

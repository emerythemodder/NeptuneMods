import { createClient, type User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { navigate } from "./router";

// PKCE puts the sign-in result in the query string (?code=…), which keeps it out of
// the way of the hash router.
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, storageKey: "neptune:auth" },
      })
    : null;

/** False until the site owner adds a Supabase project (see SETUP-ACCOUNTS.md). */
export const accountsEnabled = supabase !== null;

export type SocialProvider = "google" | "azure" | "discord";

export const SOCIAL_PROVIDERS: { id: SocialProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "azure", label: "Microsoft" },
  { id: "discord", label: "Discord" },
];

interface AuthState {
  status: "loading" | "signed-out" | "signed-in";
  user: User | null;
}

let state: AuthState = { status: accountsEnabled ? "loading" : "signed-out", user: null };
const listeners = new Set<() => void>();
function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const getAuth = () => state;

export function onAuthChange(fn: (s: AuthState) => void): () => void {
  const l = () => fn(state);
  listeners.add(l);
  return () => listeners.delete(l);
}

const RETURN_KEY = "neptune:return-to";

/** The page address without the query or hash, used as the redirect target for emails and OAuth. */
const siteUrl = () => `${location.origin}${location.pathname}`;

function rememberPage() {
  try {
    const here = location.hash.replace(/^#/, "");
    if (here && !here.startsWith("/signin")) sessionStorage.setItem(RETURN_KEY, here);
  } catch {
    // Without storage the user just lands on the home page.
  }
}

function returnToRememberedPage() {
  try {
    const to = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (to) location.hash = to;
    else if (location.hash.startsWith("#/signin")) navigate("/");
  } catch {
    // Ignore.
  }
}

export function initAuth() {
  if (!supabase) return;
  const cameBack = new URLSearchParams(location.search).has("code");
  supabase.auth.getSession().then(({ data }) => {
    setState({ status: data.session ? "signed-in" : "signed-out", user: data.session?.user ?? null });
  });
  supabase.auth.onAuthStateChange((event, session) => {
    setState({ status: session ? "signed-in" : "signed-out", user: session?.user ?? null });
    if (event === "PASSWORD_RECOVERY") navigate("/reset-password");
    else if (event === "SIGNED_IN" && cameBack) returnToRememberedPage();
    if (cameBack) {
      // Drop ?code=… from the address bar once Supabase has used it.
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
    }
  });
}

function need() {
  if (!supabase) throw new Error("Accounts aren't set up on this site yet.");
  return supabase;
}

/** Supabase error messages are fine for people, except a few worth rewording. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match an account.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first. Check your inbox for the link we sent.";
  if (/rate limit/i.test(message)) return "Too many attempts. Wait a few minutes and try again.";
  return message;
}

async function run<R extends { data: unknown; error: { message: string } | null }>(p: PromiseLike<R>): Promise<R["data"]> {
  const r = await p;
  if (r.error) throw new Error(friendly(r.error.message));
  return r.data;
}

/** Returns true if the account is ready, false if it's waiting for email confirmation. */
export async function signUpWithEmail(email: string, password: string): Promise<boolean> {
  const data = await run(need().auth.signUp({ email, password, options: { emailRedirectTo: siteUrl() } }));
  return data.session !== null;
}

export async function signInWithEmail(email: string, password: string) {
  await run(need().auth.signInWithPassword({ email, password }));
  returnToRememberedPage();
}

export async function signInWithProvider(provider: SocialProvider) {
  rememberPage();
  await run(
    need().auth.signInWithOAuth({
      provider,
      // Microsoft only shares the email address when asked.
      options: { redirectTo: siteUrl(), scopes: provider === "azure" ? "email" : undefined },
    }),
  );
}

export async function sendPasswordReset(email: string) {
  await run(need().auth.resetPasswordForEmail(email, { redirectTo: siteUrl() }));
}

export async function updatePassword(password: string) {
  await run(need().auth.updateUser({ password }));
}

export async function signOut() {
  await need().auth.signOut();
}

/** Deletes the account and everything synced to it (see delete_my_account in supabase/schema.sql). */
export async function deleteAccount() {
  await run(need().rpc("delete_my_account"));
  await need().auth.signOut();
}

export function signInMethods(user: User | null): string[] {
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const names: Record<string, string> = { email: "Email", google: "Google", azure: "Microsoft", discord: "Discord" };
  return providers.map((p) => names[p] ?? p);
}

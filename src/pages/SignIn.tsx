import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Notice } from "../components/ui";
import {
  SOCIAL_PROVIDERS,
  accountsEnabled,
  sendPasswordReset,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  updatePassword,
  useAuth,
  type SocialProvider,
} from "../lib/auth";
import { Link, navigate, useRoute } from "../lib/router";

const MIN_PASSWORD = 8;

function ProviderMark({ id }: { id: SocialProvider }) {
  if (id === "azure") {
    return (
      <svg width="14" height="14" viewBox="0 0 21 21" aria-hidden>
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
    );
  }
  const color = id === "google" ? "#4285f4" : "#5865f2";
  return <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />;
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="input h-9 pr-9"
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={autoComplete === "new-password" ? MIN_PASSWORD : undefined}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-fg"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm pt-4 sm:pt-10">
      <div className="mb-6 text-center">
        <img src="./logo.png" alt="" width={44} height={44} className="mx-auto mb-3" />
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      <div className="panel p-5">{children}</div>
    </div>
  );
}

export function SignIn() {
  const { query } = useRoute();
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(query.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<"confirm" | "reset" | null>(null);

  if (!accountsEnabled) {
    return (
      <Card title="Sign in">
        <Notice>Accounts aren't switched on for this copy of Neptune yet. Your profile and collections are still saved in this browser.</Notice>
      </Card>
    );
  }

  if (auth.status === "signed-in") {
    return (
      <Card title="You're signed in" subtitle={auth.user?.email ?? undefined}>
        <Link to="/profile" className="btn btn-primary w-full">
          Go to your profile
        </Link>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card title="Check your email">
        <div className="space-y-3 text-center text-[13px] text-muted">
          <MailCheck size={28} className="mx-auto text-accent" strokeWidth={1.5} />
          <p>
            We sent a link to <span className="text-fg">{email}</span>.{" "}
            {sent === "confirm" ? "Open it to confirm your account and you'll be signed in." : "Open it to choose a new password."}
          </p>
          <p className="text-faint">Nothing there after a few minutes? Check spam, or try again.</p>
          <button className="btn w-full" onClick={() => setSent(null)}>
            Back
          </button>
        </div>
      </Card>
    );
  }

  const go = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(async () => {
      if (mode === "forgot") {
        await sendPasswordReset(email.trim());
        setSent("reset");
      } else if (mode === "signup") {
        if (password.length < MIN_PASSWORD) throw new Error(`Use at least ${MIN_PASSWORD} characters for your password.`);
        const ready = await signUpWithEmail(email.trim(), password);
        if (!ready) setSent("confirm");
      } else {
        await signInWithEmail(email.trim(), password);
      }
    });
  };

  const titles = {
    signin: ["Sign in to Neptune", "Your profile and collections follow you to any device."],
    signup: ["Create your account", "Free. Your profile and collections follow you to any device."],
    forgot: ["Reset your password", "We'll email you a link to choose a new one."],
  } as const;

  return (
    <Card title={titles[mode][0]} subtitle={titles[mode][1]}>
      {mode !== "forgot" && (
        <>
          <div className="space-y-2">
            {SOCIAL_PROVIDERS.map((p) => (
              <button key={p.id} type="button" className="btn h-9 w-full" disabled={busy} onClick={() => go(() => signInWithProvider(p.id))}>
                <ProviderMark id={p.id} /> Continue with {p.label}
              </button>
            ))}
          </div>
          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="label">Email</span>
          <input className="input h-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {mode !== "forgot" && (
          <label className="block">
            <span className="label flex justify-between">
              Password
              {mode === "signin" && (
                <button type="button" className="text-accent hover:underline" onClick={() => setMode("forgot")}>
                  Forgot?
                </button>
              )}
            </span>
            <PasswordInput value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            {mode === "signup" && <span className="mt-1 block text-[12px] text-faint">At least {MIN_PASSWORD} characters.</span>}
          </label>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn btn-primary h-9 w-full" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button className="text-accent hover:underline" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        ) : mode === "forgot" ? (
          <button className="text-accent hover:underline" onClick={() => setMode("signin")}>
            Back to sign in
          </button>
        ) : (
          <>
            New to Neptune?{" "}
            <button className="text-accent hover:underline" onClick={() => setMode("signup")}>
              Create an account
            </button>
          </>
        )}
      </p>
    </Card>
  );
}

export function ResetPassword() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (auth.status !== "signed-in") {
    return (
      <Card title="Reset your password">
        <Notice>Open this page from the link in your reset email. Links expire after an hour.</Notice>
        <Link to="/signin" className="btn mt-3 w-full">
          Back to sign in
        </Link>
      </Card>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      navigate("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Choose a new password" subtitle={auth.user?.email ?? undefined}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="label">New password</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn btn-primary h-9 w-full" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </Card>
  );
}

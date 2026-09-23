import Logo from "@/components/logo";

export function AuthLoading({ label }: { label: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/15 bg-[#111111] px-8 py-10 text-center shadow-2xl shadow-black/30">
      <Logo className="text-white" />
      <div className="mt-8 flex gap-1" aria-hidden="true">
        <span className="auth-loading-bar" />
        <span className="auth-loading-bar" />
        <span className="auth-loading-bar" />
      </div>
      <p className="mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-200">
        {label}
      </p>
      <p className="mt-2 text-sm text-zinc-300">Preparing your secure workspace…</p>
    </div>
  );
}

export function AuthUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-white/15 bg-[#111111] px-8 py-10 text-center shadow-2xl shadow-black/30">
      <Logo className="text-white" />
      <h1 className="mt-8 text-xl font-semibold text-white">Sign in is unavailable</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        We could not load the secure sign-in service. Check your connection or browser privacy
        settings, then try again.
      </p>
      <a
        className="mt-7 inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
        href={retryHref}
      >
        Reload sign in
      </a>
    </div>
  );
}

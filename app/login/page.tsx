import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_35px_120px_-45px_rgba(129,140,248,0.7)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-200/80">
              StudyFetch
            </span>
            <h1 className="mt-4 text-3xl font-semibold text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-indigo-100/70">
              Sign in to pick up where you left off or create a new account to get started.
            </p>
          </div>

          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-indigo-100/90">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-indigo-100 placeholder:text-indigo-100/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-indigo-100/90">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-indigo-100 placeholder:text-indigo-100/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 text-sm font-medium">
              <button
                formAction={login}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-3 text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/80"
              >
                Log in
              </button>
              <button
                formAction={signup}
                className="w-full rounded-xl border border-indigo-300/60 bg-transparent px-4 py-3 text-indigo-100 transition hover:border-indigo-200 hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/80"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

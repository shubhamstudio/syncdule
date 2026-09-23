import { ClerkFailed, SignUp } from "@clerk/nextjs"
import { AuthLoading, AuthUnavailable } from "@/components/auth/auth-loading"
import { authAppearance } from "@/components/auth/auth-appearance"

const SignUpPage = () => {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <ClerkFailed>
        <AuthUnavailable retryHref="/sign-up" />
      </ClerkFailed>
      <div className="w-full max-w-md">
        <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/calendar"
        appearance={authAppearance}
        fallback={<AuthLoading label="Loading account setup" />}
      />
      </div>
    </main>
  )
}

export default SignUpPage

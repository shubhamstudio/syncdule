import { ClerkFailed, SignIn } from "@clerk/nextjs"
import { AuthLoading, AuthUnavailable } from "@/components/auth/auth-loading"
import { authAppearance } from "@/components/auth/auth-appearance"

const SignInPage = () => {
  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <ClerkFailed>
        <AuthUnavailable retryHref="/sign-in" />
      </ClerkFailed>
      <div className="w-full max-w-md">
        <SignIn
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/calendar"
          appearance={authAppearance}
          fallback={<AuthLoading label="Loading sign in" />}
        />
      </div>
    </main>
  )
}

export default SignInPage

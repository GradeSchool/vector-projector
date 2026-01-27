import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Modal } from '@/components/Modal'
import { authClient } from '@/lib/auth-client'

interface AuthSuccessResult {
  userId: string
  email: string
  name?: string
  isAdmin: boolean
  sessionId: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onAuthSuccess?: (result: AuthSuccessResult) => void
}

type Step = 'form' | 'verify' | 'reset' | 'reset-success'

// Password validation helper
function isValidPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  )
}

// Spam folder callout component
function SpamCallout() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
      <strong>Check your spam folder</strong> if you don't see the email in your inbox.
    </div>
  )
}

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

export function AuthModal({ isOpen, onClose, mode, onAuthSuccess }: AuthModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const ensureAppUser = useMutation(api.users.ensureAppUser)

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setEmail('')
      setPassword('')
      setNewPassword('')
      setName('')
      setCode('')
      setError('')
      setFieldErrors({})
    }
  }, [isOpen, mode])

  // Clear field error when user types
  const handleNameChange = (value: string) => {
    setName(value)
    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }))
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }))
  }

  // Validate form fields before submit
  const validateForm = (): boolean => {
    const errors: FieldErrors = {}

    if (mode === 'signup' && !name.trim()) {
      errors.name = 'Name is required'
    }

    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else {
      const passwordErrors: string[] = []
      if (password.length < 12) passwordErrors.push('12+ characters')
      if (!/[A-Z]/.test(password)) passwordErrors.push('uppercase')
      if (!/[a-z]/.test(password)) passwordErrors.push('lowercase')
      if (!/[0-9]/.test(password)) passwordErrors.push('number')
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) passwordErrors.push('special character')
      if (passwordErrors.length > 0) {
        errors.password = `Missing: ${passwordErrors.join(', ')}`
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate before submitting
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })

        if (result.error) {
          // Try to map server errors to fields (check specific errors first)
          const msg = result.error.message || 'Something went wrong'
          const msgLower = msg.toLowerCase()

          if (msgLower.includes('already exists') || msgLower.includes('already registered') || msgLower.includes('user already')) {
            setFieldErrors(prev => ({ ...prev, email: 'An account with this email already exists' }))
          } else if (msg.includes('[body.name]') || (msgLower.includes('name') && !msgLower.includes('email'))) {
            setFieldErrors(prev => ({ ...prev, name: 'Name is required' }))
          } else if (msg.includes('[body.email]')) {
            setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email' }))
          } else if (msg.includes('[body.password]') || msgLower.includes('password')) {
            setFieldErrors(prev => ({ ...prev, password: 'Password does not meet requirements' }))
          } else {
            setError(msg)
          }
          return
        }

        // Signup succeeded, now send verification OTP
        const otpResult = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: 'email-verification',
        })

        if (otpResult.error) {
          setError(otpResult.error.message || 'Failed to send verification code')
          return
        }

        setStep('verify')
      } else {
        const signInResult = await authClient.signIn.email({
          email,
          password,
        })

        if (signInResult.error) {
          const msg = signInResult.error.message || 'Something went wrong'
          // Common sign-in errors
          if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('credentials')) {
            setError('Invalid email or password')
          } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user')) {
            setError('No account found with this email')
          } else if (msg.toLowerCase().includes('not verified')) {
            setError('Please verify your email first')
          } else {
            setError(msg)
          }
          return
        }

        // Create app user if needed, check admin status, start session
        const appUserResult = await ensureAppUser()

        if (onAuthSuccess) {
          onAuthSuccess(appUserResult)
        }
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const verifyResult = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      })

      if (verifyResult.error) {
        setError(verifyResult.error.message || 'Invalid code')
        return
      }

      // Email verified, now sign in automatically
      const signInResult = await authClient.signIn.email({
        email,
        password,
      })

      if (signInResult.error) {
        setError(signInResult.error.message || 'Verification succeeded but sign-in failed')
        return
      }

      // Create app user if needed, check admin status, start session
      const appUserResult = await ensureAppUser()

      if (onAuthSuccess) {
        onAuthSuccess(appUserResult)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })

      if (result.error) {
        setError(result.error.message || 'Failed to resend code')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) return

    setError('')
    setLoading(true)

    try {
      // Try to send reset OTP - silently handle errors for security
      // (don't reveal if account exists or not)
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      })
    } catch {
      // Silently ignore errors - don't reveal account existence
    } finally {
      setLoading(false)
      // Always show reset step regardless of whether email was sent
      setCode('')
      setNewPassword('')
      setStep('reset')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp: code,
        password: newPassword,
      })

      if (result.error) {
        setError(result.error.message || 'Invalid code or password reset failed')
        return
      }

      // Success - show success message
      setStep('reset-success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResendResetCode = async () => {
    setError('')
    setLoading(true)

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      })
    } catch {
      // Silently ignore - don't reveal account existence
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)

    try {
      await authClient.signIn.social({ provider: 'google' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  // Password reset success step
  if (step === 'reset-success') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Password Reset">
        <div className="space-y-4 text-center">
          <div className="text-green-600 text-4xl">✓</div>
          <p className="text-sm text-gray-600">
            Your password has been reset successfully.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('form')
              setPassword('')
              setCode('')
            }}
            className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600"
          >
            Sign In
          </button>
        </div>
      </Modal>
    )
  }

  // Password reset step
  if (step === 'reset') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Reset Password">
        <form onSubmit={handleResetPassword} className="space-y-3">
          <p className="text-sm text-gray-600">
            If an account with a password exists for <strong>{email}</strong>, we've sent a 6-digit code.
          </p>

          <SpamCallout />

          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-2xl tracking-widest"
          />

          <div>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-xs text-gray-400 mt-1">12+ chars, uppercase, lowercase, number, special</p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6 || !isValidPassword(newPassword)}
            className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <button
            type="button"
            onClick={handleResendResetCode}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Resend code
          </button>

          <button
            type="button"
            onClick={() => setStep('form')}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to sign in
          </button>
        </form>
      </Modal>
    )
  }

  // Verification step
  if (step === 'verify') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Verify your email">
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          <SpamCallout />

          <input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 text-center text-2xl tracking-widest"
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      </Modal>
    )
  }

  // Sign in / Sign up form
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <div>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                fieldErrors.name ? 'border-red-400' : ''
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
            )}
          </div>
        )}
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              fieldErrors.email ? 'border-red-400' : ''
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
          )}
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              fieldErrors.password ? 'border-red-400' : ''
            }`}
          />
          {fieldErrors.password ? (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">12+ chars, uppercase, lowercase, number, special</p>
          )}
        </div>

        {mode === 'signin' && (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading || !email}
            className="text-sm text-sky-600 hover:text-sky-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {email ? 'Forgot password?' : 'Forgot password? Enter your email above'}
          </button>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm bg-sky-500 text-white rounded hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
        </form>
      </div>
    </Modal>
  )
}

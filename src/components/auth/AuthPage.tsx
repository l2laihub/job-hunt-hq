/**
 * Authentication Page Component
 * Handles login, signup, and password reset
 */
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import { Briefcase, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, Info } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  onSuccess?: () => void;
}

interface ValidationState {
  email: { valid: boolean; message: string };
  password: { valid: boolean; message: string; strength: number };
  name: { valid: boolean; message: string };
}

function validateEmail(email: string): { valid: boolean; message: string } {
  if (!email) return { valid: false, message: '' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  return { valid: true, message: '' };
}

function validatePassword(password: string): { valid: boolean; message: string; strength: number } {
  if (!password) return { valid: false, message: '', strength: 0 };

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  if (checks.length) strength += 20;
  if (checks.lowercase) strength += 20;
  if (checks.uppercase) strength += 20;
  if (checks.number) strength += 20;
  if (checks.special) strength += 20;

  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters', strength };
  }

  return { valid: true, message: '', strength };
}

function validateName(name: string): { valid: boolean; message: string } {
  if (!name) return { valid: false, message: '' };
  if (name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }
  return { valid: true, message: '' };
}

function getReadableErrorMessage(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
    'Email not confirmed': 'Please verify your email address before signing in. Check your inbox for the confirmation link.',
    'User already registered': 'An account with this email already exists. Try signing in instead.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'Signup requires a valid password': 'Please enter a valid password.',
    'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
    'For security purposes, you can only request this once every 60 seconds': 'Please wait 60 seconds before requesting another password reset.',
  };
  return errorMap[message] || message;
}

function PasswordStrengthBar({ strength }: { strength: number }) {
  const getColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getLabel = () => {
    if (strength < 40) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  if (strength === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Password strength</span>
        <span className={cn(
          'text-xs font-medium',
          strength < 40 ? 'text-red-400' :
          strength < 60 ? 'text-yellow-400' :
          strength < 80 ? 'text-blue-400' : 'text-green-400'
        )}>{getLabel()}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', getColor())}
          style={{ width: `${strength}%` }}
        />
      </div>
    </div>
  );
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false, name: false });

  // Real-time validation
  const validation: ValidationState = useMemo(() => ({
    email: validateEmail(email),
    password: validatePassword(password),
    name: validateName(name),
  }), [email, password, name]);

  // Check if form is valid for submission
  const isFormValid = () => {
    if (mode === 'forgot-password') {
      return validation.email.valid;
    }
    if (mode === 'signup') {
      return validation.email.valid && validation.password.valid && validation.name.valid;
    }
    return validation.email.valid && password.length >= 6;
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setTouched({ email: false, password: false, name: false });
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 rounded-xl p-8 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Job Hunt HQ</h1>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-400">Supabase Not Configured</h3>
                <p className="text-sm text-yellow-400/80 mt-1">
                  To enable authentication, add your Supabase credentials to{' '}
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded">.env.local</code>:
                </p>
                <pre className="mt-3 bg-gray-800 p-3 rounded text-xs text-gray-300 overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Mark all fields as touched
    setTouched({ email: true, password: true, name: true });

    // Validate before submitting
    if (!isFormValid()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Welcome back! Signing you in...');
          onSuccess?.();
        }
      } else if (mode === 'signup') {
        const { error: authError } = await signUp(email, password, { full_name: name });
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Account created! Please check your email to verify your account before signing in.');
        }
      } else if (mode === 'forgot-password') {
        const { error: authError } = await resetPassword(email);
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Password reset email sent! Check your inbox for instructions.');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(getReadableErrorMessage(authError.message));
      }
    } catch {
      setError('Failed to connect to Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Job Hunt HQ</h1>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {/* Tabs */}
          {mode !== 'forgot-password' && (
            <div className="flex border-b border-gray-800">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  mode === 'login'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  mode === 'signup'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                )}
              >
                Create Account
              </button>
            </div>
          )}

          <div className="p-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {mode === 'forgot-password' ? (
              <>
                <h2 className="text-lg font-semibold text-white mb-2">Reset Password</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Enter your email and we'll send you a reset link.
                </p>
              </>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      placeholder="John Doe"
                      className={cn(
                        'w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent',
                        touched.name && !validation.name.valid && name
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-700 focus:ring-blue-500'
                      )}
                      required
                    />
                  </div>
                  {touched.name && validation.name.message && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validation.name.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="you@example.com"
                    className={cn(
                      'w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent',
                      touched.email && !validation.email.valid && email
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-700 focus:ring-blue-500'
                    )}
                    required
                  />
                </div>
                {touched.email && validation.email.message && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validation.email.message}
                  </p>
                )}
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      className={cn(
                        'w-full bg-gray-800 border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent',
                        touched.password && !validation.password.valid && password
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-700 focus:ring-blue-500'
                      )}
                      required
                      minLength={6}
                    />
                  </div>
                  {touched.password && validation.password.message && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validation.password.message}
                    </p>
                  )}
                  {mode === 'signup' && <PasswordStrengthBar strength={validation.password.strength} />}
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot-password')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (touched.email && !isFormValid())}
                className={cn(
                  'w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
                  loading || (touched.email && !isFormValid())
                    ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                )}
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot-password' && 'Send Reset Link'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="w-full mt-4 text-sm text-gray-400 hover:text-gray-300"
              >
                Back to Sign In
              </button>
            )}

            {mode !== 'forgot-password' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white text-gray-900 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default AuthPage;

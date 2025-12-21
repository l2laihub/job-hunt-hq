/**
 * Authentication Modal
 * Modal for sign in/sign up
 * Uses Portal to render at document root
 */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/src/lib/supabase';
import { Button, Input } from '@/src/components/ui';
import {
  useSupabaseProfileStore,
  useSupabaseApplicationStore,
  useSupabaseStoriesStore,
} from '@/src/stores/supabase';
import {
  Mail,
  Lock,
  User,
  ArrowLeft,
  X,
  Loader2,
  Cloud,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  // Map Supabase error messages to user-friendly versions
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

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompletedAuth, setHasCompletedAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false, name: false });

  const fetchProfiles = useSupabaseProfileStore((s) => s.fetchProfiles);
  const fetchApplications = useSupabaseApplicationStore((s) => s.fetchApplications);
  const fetchStories = useSupabaseStoriesStore((s) => s.fetchStories);

  // Real-time validation
  const validation: ValidationState = useMemo(() => ({
    email: validateEmail(email),
    password: validatePassword(password),
    name: validateName(name),
  }), [email, password, name]);

  // Complete the auth flow after user signs in
  useEffect(() => {
    if (user && isOpen && !hasCompletedAuth) {
      setHasCompletedAuth(true);
      handleComplete();
    }
  }, [user, isOpen, hasCompletedAuth]);

  // Reset hasCompletedAuth when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasCompletedAuth(false);
    }
  }, [isOpen]);

  const refreshData = async () => {
    try {
      await Promise.all([
        fetchProfiles(),
        fetchApplications(),
        fetchStories(),
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleComplete = async () => {
    await refreshData();
    onSuccess?.();
    handleClose();
  };

  if (!isOpen) return null;

  // Check if form is valid for submission
  const isFormValid = () => {
    if (mode === 'forgot') {
      return validation.email.valid;
    }
    if (mode === 'signup') {
      return validation.email.valid && validation.password.valid && validation.name.valid;
    }
    return validation.email.valid && password.length >= 6;
  };

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

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Welcome back! Signing you in...');
          // useEffect will handle completing the auth flow
        }
      } else if (mode === 'signup') {
        const { error: authError } = await signUp(email, password, { full_name: name });
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
          setMode('login');
        }
      } else if (mode === 'forgot') {
        const { error: authError } = await resetPassword(email);
        if (authError) {
          setError(getReadableErrorMessage(authError.message));
        } else {
          setSuccess('Password reset email sent! Check your inbox for instructions.');
          setMode('login');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(getReadableErrorMessage(authError.message));
      }
      // Don't close - Google OAuth redirects the page
    } catch {
      setError('Failed to connect to Google. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setMode('login');
    setError(null);
    setSuccess(null);
    setTouched({ email: false, password: false, name: false });
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setTouched({ email: false, password: false, name: false });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get the modal root element
  const modalRoot = document.getElementById('modal-root');

  if (!modalRoot) {
    console.warn('modal-root element not found, using document.body');
  }

  // Use portal to render modal at dedicated modal root level
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        style={{ zIndex: 99999 }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl"
        style={{ zIndex: 100000 }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-gray-400 text-sm">
            {mode === 'login' && 'Sign in to sync your data across devices'}
            {mode === 'signup' && 'Start syncing your job hunt data to the cloud'}
            {mode === 'forgot' && 'Enter your email to receive reset instructions'}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 pb-6">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Input
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="John Doe"
                  leftIcon={<User className="w-4 h-4" />}
                  required
                  className={cn(
                    touched.name && !validation.name.valid && name && 'border-red-500 focus:ring-red-500'
                  )}
                />
                {touched.name && validation.name.message && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validation.name.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
                className={cn(
                  touched.email && !validation.email.valid && email && 'border-red-500 focus:ring-red-500'
                )}
              />
              {touched.email && validation.email.message && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validation.email.message}
                </p>
              )}
            </div>

            {mode !== 'forgot' && (
              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  minLength={6}
                  className={cn(
                    touched.password && !validation.password.valid && password && 'border-red-500 focus:ring-red-500'
                  )}
                />
                {touched.password && validation.password.message && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validation.password.message}
                  </p>
                )}
                {mode === 'signup' && <PasswordStrengthBar strength={validation.password.strength} />}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting || (touched.email && !isFormValid())}
              leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isSubmitting ? 'Please wait...' : (
                mode === 'login' ? 'Sign In' :
                mode === 'signup' ? 'Create Account' :
                'Send Reset Email'
              )}
            </Button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">or</span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => handleModeChange('forgot')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
                <span className="text-gray-500 mx-2">•</span>
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Create account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Already have an account?
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    modalRoot || document.body
  );
}

export default AuthModal;

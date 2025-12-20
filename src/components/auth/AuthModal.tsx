/**
 * Authentication Modal
 * Modal for sign in/sign up
 * Uses Portal to render at document root
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/src/lib/supabase';
import { Button, Input } from '@/src/components/ui';
import { toast } from '@/src/stores';
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
} from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompletedAuth, setHasCompletedAuth] = useState(false);

  const fetchProfiles = useSupabaseProfileStore((s) => s.fetchProfiles);
  const fetchApplications = useSupabaseApplicationStore((s) => s.fetchApplications);
  const fetchStories = useSupabaseStoriesStore((s) => s.fetchStories);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Login failed', error.message);
        } else {
          toast.success('Welcome back!', 'You have been signed in');
          // useEffect will handle completing the auth flow
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, { full_name: name });
        if (error) {
          toast.error('Signup failed', error.message);
        } else {
          toast.success('Account created', 'Please check your email to verify your account');
          setMode('login');
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error('Reset failed', error.message);
        } else {
          toast.success('Email sent', 'Check your email for password reset instructions');
          setMode('login');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error('Google sign-in failed', error.message);
      }
      // Don't close - Google OAuth redirects the page
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setMode('login');
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                leftIcon={<User className="w-4 h-4" />}
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            {mode !== 'forgot' && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                required
                minLength={6}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
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
                  onClick={() => setMode('forgot')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
                <span className="text-gray-500 mx-2">•</span>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Create account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" /> Already have an account?
              </button>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
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

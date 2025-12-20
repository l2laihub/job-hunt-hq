/**
 * User Menu Component
 * Shows authenticated user info and logout option
 * Uses portal for dropdown to avoid sidebar overflow issues
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/src/lib/supabase';
import { LogOut, Settings, ChevronDown, Cloud, CloudOff, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { AuthModal } from './AuthModal';
import { profilesService } from '@/src/services/database';
import { useSupabaseProfileStore } from '@/src/stores/supabase';
import { toast } from '@/src/stores';

interface DropdownPosition {
  top: number;
  left: number;
}

export function UserMenu() {
  const { user, signOut, isConfigured } = useAuth();
  const fetchProfiles = useSupabaseProfileStore((s) => s.fetchProfiles);
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // w-64 = 16rem = 256px

      // Position dropdown below the button, aligned to right edge
      let left = rect.right - dropdownWidth;

      // Make sure it doesn't go off the left edge of screen
      if (left < 8) {
        left = 8;
      }

      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap (mt-2)
        left,
      });
    }
  }, []);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      // Also update on scroll/resize
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleCleanupDuplicates = async () => {
    setIsCleaningUp(true);
    try {
      const result = await profilesService.cleanupDuplicates();
      if (result.deleted > 0) {
        toast.success('Duplicates removed', `Removed ${result.deleted} duplicate profile(s), kept ${result.kept}`);
        // Refresh the profile store
        await fetchProfiles();
      } else {
        toast.info('No duplicates', 'No duplicate profiles found');
      }
    } catch (error) {
      toast.error('Cleanup failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsCleaningUp(false);
      setIsOpen(false);
    }
  };

  // Not configured - show indicator
  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/30 text-yellow-400 rounded-lg text-sm">
        <CloudOff className="w-4 h-4" />
        <span className="hidden sm:inline">Local Only</span>
      </div>
    );
  }

  // Not signed in - show sign in button
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Cloud className="w-4 h-4" />
          <span className="hidden sm:inline">Sync</span>
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Signed in - show menu
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const modalRoot = document.getElementById('modal-root');

  // Dropdown menu content (rendered via portal)
  const dropdownMenu = isOpen && modalRoot ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99998,
      }}
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-medium text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
          <Cloud className="w-3 h-3" />
          <span>Synced to cloud</span>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          onClick={handleCleanupDuplicates}
          disabled={isCleaningUp}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
        >
          {isCleaningUp ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {isCleaningUp ? 'Cleaning...' : 'Clean Up Duplicates'}
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            // Navigate to settings/profile - implement as needed
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          Account Settings
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>,
    modalRoot
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          isOpen
            ? 'bg-gray-700 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
        )}
      >
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium text-white">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {dropdownMenu}
    </>
  );
}

export default UserMenu;

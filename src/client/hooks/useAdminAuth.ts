import { useState, useEffect } from 'react';
import { AdminUser } from '../../shared/types/admin';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  user: AdminUser | null;
  permissions: {
    canManageImages: boolean;
    canViewStats: boolean;
    canModerateContent: boolean;
  };
  error: string | null;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    user: null,
    permissions: {
      canManageImages: false,
      canViewStats: false,
      canModerateContent: false,
    },
    error: null,
  });

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/admin/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      setState({
        isAdmin: data.isAdmin,
        loading: false,
        user: data.user || null,
        permissions: data.permissions,
        error: null,
      });
    } catch (error) {
      console.error('Admin auth check failed:', error);
      setState({
        isAdmin: false,
        loading: false,
        user: null,
        permissions: {
          canManageImages: false,
          canViewStats: false,
          canModerateContent: false,
        },
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  };

  const refreshAuth = () => {
    checkAdminAuth();
  };

  return {
    ...state,
    refreshAuth,
  };
};

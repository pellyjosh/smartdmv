import { useUser } from '@/context/UserContext';

export function useAuth() {
  const { user, isLoading, logout } = useUser();
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout
  };
}

import React, { createContext, useContext, useEffect } from "react";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import type { CurrentUser, LoginInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isGetMeLoading } = useGetMe({
    query: {
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (data: LoginInput) => {
    await loginMutation.mutateAsync({ data });
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    await queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isGetMeLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

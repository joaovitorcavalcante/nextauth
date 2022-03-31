import Router from "next/router";
import { setCookie } from "nookies";
import { createContext, ReactElement, useState } from "react";
import { api } from "../services/api";

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  isAuthenticated: boolean;
  user: User | undefined;
};

type AuthProviderProps = {
  children: ReactElement;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User>();
  const isAuthenticated = !!user;

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post<User>("/sessions", {
        email,
        password,
      });

      const { token, refreshToken, permissions, roles } = response.data;

      setCookie(undefined, "nexthauth.token", token, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      setCookie(undefined, "nexthauth.refreshToken", refreshToken, , {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      setUser({
        email,
        permissions,
        roles,
      });

      Router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AuthContext.Provider value={{ signIn, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
}

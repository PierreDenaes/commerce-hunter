"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface UserContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: User }>("/api/v1/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // proceed with redirect even on error
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

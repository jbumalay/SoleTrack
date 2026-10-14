import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiService } from "../services/api";
import { toast } from "sonner";

interface User {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username: string;
  email: string;
  role: "admin" | "seller" | "customer";
  brand_name?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<User | null>;
  register: (userData: any) => Promise<User | null>;
  logout: () => void;
  isAdmin: boolean;
  isSeller: boolean;
  isCustomer: boolean;
  cartCount: number;
  refreshCart: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user && user.role === 'customer') {
      refreshCart();
    } else {
      setCartCount(0);
    }
  }, [user]);

  const refreshCart = async () => {
    try {
      const response = await apiService.getCart();
      if (response.status === "success") {
        const totalQuantity = (response.data.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(totalQuantity);
      }
    } catch (error) {
      console.error("Failed to refresh cart count:", error);
    }
  };

  const checkSession = async () => {
    const token = localStorage.getItem("soletrack_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await apiService.getCurrentUser();
      if (response.status === "success") {
        setUser(response.data);
      }
    } catch (error) {
      // Not logged in or session expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: any): Promise<User | null> => {
    try {
      const response = await apiService.login(credentials);
      if (response.status === "success") {
        const { token, ...userData } = response.data;
        localStorage.setItem("soletrack_token", token);
        setUser(userData);
        toast.success("Welcome back, " + (userData.username || userData.first_name));
        return userData;
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      return null;
    }
  };

  const register = async (userData: any): Promise<User | null> => {
    try {
      const response = await apiService.register(userData);
      if (response.status === "success") {
        const { token, ...data } = response.data;
        localStorage.setItem("soletrack_token", token);
        setUser(data);
        toast.success("Account created!");
        return data;
      }
      return null;
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
      return null;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      localStorage.removeItem("soletrack_token");
      setUser(null);
      toast.info("Logged out successfully");
    }
  };

  const isAdmin = user?.role === "admin";
  const isSeller = user?.role === "seller";
  const isCustomer = user?.role === "customer";

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      isAdmin, 
      isSeller, 
      isCustomer,
      cartCount,
      refreshCart
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

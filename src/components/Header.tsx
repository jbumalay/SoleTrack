import { Link, useLocation, useNavigate } from "react-router";
import { ShoppingCart, Search, Menu, User, LogOut, X, Footprints, Heart } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { readWishlist } from "../utils/wishlist";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  cartItemCount?: number;
}

export function Header({ cartItemCount = 0 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSeller } = useAuth();
  const wishlistCount = readWishlist().length;

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/products", label: "Products" },
    { path: "/stores", label: "Stores" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-xl text-primary-foreground transition-all group-hover:scale-105 group-active:scale-95 shadow-lg shadow-primary/20">
              <Footprints className="w-6 h-6" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-black italic tracking-tighter leading-none">Sole<span className="text-primary">Track</span></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-0.5">Heritage Collective</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors hover:text-primary ${
                  isActive(link.path)
                    ? "text-primary border-b-2 border-primary"
                    : "text-foreground/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <NotificationBell />
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <>
                <Link
                  to={isAdmin ? "/admin" : isSeller ? "/seller" : "/dashboard"}
                  className="px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                >
                  {isAdmin ? "Admin" : isSeller ? "Seller Portal" : "My Dashboard"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm font-medium"
              >
                <User className="w-5 h-5" />
                <span>Login</span>
              </Link>
            )}

            {!isAdmin && !isSeller && (
              <Link
                to="/wishlist"
                className="relative p-2.5 hover:bg-muted rounded-xl transition-all group"
                title="Wishlist"
              >
                <Heart className="w-5 h-5 group-active:scale-95 transition-transform" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white shadow-lg shadow-red-500/20">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {!isAdmin && !isSeller && (
              <Link
                to="/cart"
                className="relative p-2.5 hover:bg-muted rounded-xl transition-all group"
              >
                <ShoppingCart className="w-5 h-5 group-active:scale-95 transition-transform" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white shadow-lg shadow-primary/20">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-2 border-t">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-2 rounded-lg transition-colors ${
                  isActive(link.path)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t pt-2 space-y-2">
              {user ? (
                <>
                  <Link
                    to={isAdmin ? "/admin" : isSeller ? "/seller" : "/dashboard"}
                    className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {isAdmin ? "Admin Console" : isSeller ? "Seller Portal" : "My Dashboard"}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
              {!isAdmin && !isSeller && (
                <Link
                  to="/wishlist"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Heart className="w-5 h-5" />
                  <span>Wishlist {wishlistCount > 0 && `(${wishlistCount})`}</span>
                </Link>
              )}
              {!isAdmin && !isSeller && (
                <Link
                  to="/cart"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart {cartItemCount > 0 && `(${cartItemCount})`}</span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {searchOpen && (
          <div className="hidden md:block absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
            <div className="container mx-auto px-4 py-4">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for footwear..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

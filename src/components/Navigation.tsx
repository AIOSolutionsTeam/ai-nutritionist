"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Accueil" },
    { href: "/about", label: "À Propos" },
    { href: "/contact", label: "Contact" },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Thin Dark Announcement Bar - Responsive */}
      <div className="bg-banner text-white py-2 text-center text-[10px] sm:text-xs uppercase tracking-[0.15em] px-4">
        <p className="hidden sm:block">
          Solutions de Bien-être Premium • Scientifiquement Appuyé • Fait Confiance par des Milliers
        </p>
        <p className="sm:hidden">
          Solutions de Bien-être Premium
        </p>
      </div>

      {/* Minimalist Navigation with Generous Spacing */}
      <nav className="bg-card/95 backdrop-blur-sm sticky top-0 z-50 border-b border-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between items-center h-16 sm:h-20 lg:h-24">
            {/* Logo */}
            <Link
              href="/"
              className="font-serif uppercase tracking-widest text-lg sm:text-xl md:text-2xl lg:text-3xl font-light text-foreground hover:opacity-80 transition-opacity"
              onClick={closeMobileMenu}
            >
              Nutritionniste IA
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8 lg:space-x-12">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs uppercase tracking-[0.2em] font-light transition-all duration-300 relative ${
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {pathname === item.href && (
                    <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-foreground"></div>
                  )}
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5 focus:outline-none"
              aria-label="Basculer le menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span
                className={`block w-6 h-[1px] bg-foreground transition-all duration-300 ${
                  isMobileMenuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`block w-6 h-[1px] bg-foreground transition-all duration-300 ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-6 h-[1px] bg-foreground transition-all duration-300 ${
                  isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="py-4 space-y-4 border-t border-muted/20">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`block text-sm uppercase tracking-[0.2em] font-light transition-all duration-300 py-2 ${
                    pathname === item.href
                      ? "text-foreground border-l-2 border-foreground pl-4"
                      : "text-muted-foreground hover:text-foreground pl-4"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

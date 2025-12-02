"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      {/* Thin Announcement Bar */}
      <div className="bg-[#1A1A1A] text-white py-2 text-center text-xs subheading">
        <p className="tracking-wider">Premium Wellness Solutions • Scientifically Backed • Trusted by Thousands</p>
      </div>

      {/* Minimalist Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm sticky top-0 z-50 border-b border-[#F5D5D5]/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-24">
            <Link
              href="/"
              className="headline text-2xl lg:text-3xl font-light text-[#1A1A1A] tracking-[0.15em] hover:opacity-80 transition-opacity"
            >
              AI Nutritionist
            </Link>

            <div className="flex items-center space-x-12">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`subheading text-sm font-light transition-all duration-300 relative ${
                    pathname === item.href
                      ? "text-[#1A1A1A]"
                      : "text-[#6B6B6B] hover:text-[#1A1A1A]"
                  }`}
                >
                  {item.label}
                  {pathname === item.href && (
                    <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-[#1A1A1A]"></div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

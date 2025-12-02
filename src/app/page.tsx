"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";
import ChatWidget from "../components/ChatWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <Navigation />
      
      {/* Split-Screen Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row">
        {/* Left Side - Lifestyle Photography Placeholder with Gradient Blend */}
        <div className="lg:w-1/2 relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#6B8E6B] via-[#6B8E6B]/80 to-[#6B8E6B]/60"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          />
          {/* Placeholder for lifestyle image - in production, replace with actual image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/20 text-6xl">🥗</div>
          </div>
          {/* Gradient overlay blending into right side */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#F5C842]/20"></div>
        </div>

        {/* Right Side - Content with Golden Gradient Background */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-[#F5C842]/30 via-[#F5C842]/20 to-[#FEFDFB] flex items-center justify-center py-20 lg:py-32 px-6 lg:px-16">
          <div className="max-w-2xl animate-fadeInUp">
            {/* Small decorative icon */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">✨</span>
              <span className="subheading text-[#6B6B6B]">Personalized Wellness</span>
            </div>
            
            <h1 className="headline text-5xl lg:text-7xl font-light text-[#1A1A1A] mb-6 leading-tight">
              Your Personal Health Assistant
            </h1>
            
            <p className="text-lg lg:text-xl text-[#6B6B6B] mb-10 leading-relaxed font-light max-w-xl">
              Get personalized nutrition advice, supplement recommendations, and wellness guidance tailored to your unique health goals and lifestyle.
            </p>
            
            {/* CTA Button */}
            <Link
              href="/nutritionniste"
              className="btn-outline inline-block hover:bg-[#1A1A1A] hover:text-white"
            >
              Commencer ma consultation
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20 animate-fadeInUp">
            <span className="subheading text-[#6B6B6B] block mb-4">How We Help</span>
            <h2 className="headline text-4xl lg:text-5xl font-light text-[#1A1A1A] mb-6">
              Comprehensive Wellness Support
            </h2>
            <p className="text-lg text-[#6B6B6B] max-w-2xl mx-auto font-light">
              Get personalized nutrition guidance tailored to your unique health goals and lifestyle
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="premium-card p-10 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 bg-gradient-to-br from-[#F5C842]/20 to-[#F5C842]/10 rounded-full flex items-center justify-center text-3xl mb-6">
                🍎
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Nutrition Advice
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Get personalized dietary recommendations based on your health goals, dietary restrictions, and lifestyle preferences.
              </p>
            </div>

            <div className="premium-card p-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 bg-gradient-to-br from-[#6B8E6B]/20 to-[#6B8E6B]/10 rounded-full flex items-center justify-center text-3xl mb-6">
                💊
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Supplement Guidance
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Receive expert recommendations on vitamins, minerals, and supplements that align with your nutritional needs.
              </p>
            </div>

            <div className="premium-card p-10 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              <div className="w-16 h-16 bg-gradient-to-br from-[#F5D5D5]/40 to-[#F5D5D5]/20 rounded-full flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Health Goals
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Create and track personalized health objectives with actionable steps and progress monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center">
            <p className="subheading text-white/60 mb-3">
              Powered by advanced AI technology
            </p>
            <p className="text-sm text-white/40 font-light">
              Always consult with healthcare professionals for medical advice
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  );
}

"use client";

import Link from "next/link";
import ChatWidget from "../components/ChatWidget";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-nutrition rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-float">
                🥗
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 animate-fadeInUp">
              AI Nutritionist
            </h1>
            <p
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fadeInUp"
              style={{ animationDelay: "0.2s" }}
            >
              Your personal health assistant for nutrition advice, supplement
              recommendations, and wellness guidance
            </p>
            
            {/* Commencer ma consultation Button */}
            <div className="mt-8 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
              <Link
                href="/nutritionniste"
                className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-full shadow-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              >
                Commencer ma consultation
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main content can go here */}
        </div>
      </main>

      {/* Floating Chat Widget - positioned at root level */}
      <ChatWidget />

      {/* Features Section */}
      <section className="relative z-10 py-16 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How I Can Help You
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get personalized nutrition guidance tailored to your unique health
              goals and lifestyle
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="nutrition-card bg-white p-8 rounded-2xl shadow-lg border border-green-100">
              <div className="w-12 h-12 bg-gradient-nutrition rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto">
                🍎
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Nutrition Advice
              </h3>
              <p className="text-gray-600 text-center">
                Get personalized dietary recommendations based on your health
                goals, dietary restrictions, and lifestyle preferences.
              </p>
            </div>

            <div className="nutrition-card bg-white p-8 rounded-2xl shadow-lg border border-green-100">
              <div className="w-12 h-12 bg-gradient-nutrition rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto">
                💊
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Supplement Guidance
              </h3>
              <p className="text-gray-600 text-center">
                Receive expert recommendations on vitamins, minerals, and
                supplements that align with your nutritional needs.
              </p>
            </div>

            <div className="nutrition-card bg-white p-8 rounded-2xl shadow-lg border border-green-100">
              <div className="w-12 h-12 bg-gradient-nutrition rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto">
                🎯
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Health Goals
              </h3>
              <p className="text-gray-600 text-center">
                Create and track personalized health objectives with actionable
                steps and progress monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 bg-gradient-nutrition text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-green-100 mb-2">
              Powered by advanced AI technology
            </p>
            <p className="text-sm text-green-200">
              Always consult with healthcare professionals for medical advice
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

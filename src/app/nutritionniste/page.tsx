"use client";

import { useState, useEffect } from "react";
import FullPageChat from "../../components/FullPageChat";
import Navigation from "../../components/Navigation";

export default function NutritionnistePage() {
  const [isConsultationStarted, setIsConsultationStarted] = useState(false);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Try to get user name from localStorage or generate a personalized greeting
    const storedUserId = localStorage.getItem("chat_user_id");
    if (storedUserId) {
      // If user exists, we could fetch their name from profile
      // For now, we'll use a generic personalized message
      setUserName("");
    }
  }, []);

  const handleStartConsultation = () => {
    setIsConsultationStarted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
      <Navigation />
      
      {!isConsultationStarted ? (
        // Welcome Screen
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full text-center space-y-8 animate-fadeInUp">
            {/* Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-nutrition rounded-3xl flex items-center justify-center text-5xl shadow-2xl animate-float">
                🥗
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900">
                Bienvenue{userName ? `, ${userName}` : ""} ! 👋
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-xl mx-auto leading-relaxed">
                Je suis votre <span className="font-semibold text-green-600">Nutritionniste virtuel</span>
              </p>
              <p className="text-lg text-gray-500 max-w-lg mx-auto">
                Je suis là pour vous accompagner dans votre parcours nutritionnel avec des conseils personnalisés, 
                des recommandations de compléments alimentaires adaptés à vos besoins, et un suivi personnalisé.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-900 mb-2">Conseils personnalisés</h3>
                <p className="text-sm text-gray-600">
                  Des recommandations adaptées à votre profil et vos objectifs
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl mb-3">💊</div>
                <h3 className="font-semibold text-gray-900 mb-2">Compléments alimentaires</h3>
                <p className="text-sm text-gray-600">
                  Des suggestions de produits adaptés à vos besoins spécifiques
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-900 mb-2">Suivi personnalisé</h3>
                <p className="text-sm text-gray-600">
                  Un accompagnement continu pour atteindre vos objectifs
                </p>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-8">
              <button
                onClick={handleStartConsultation}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-full shadow-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              >
                Commencer ma consultation
              </button>
            </div>

            {/* Additional Info */}
            <p className="text-sm text-gray-400 mt-6">
              Consultation gratuite • Réponses instantanées • Confidentialité garantie
            </p>
          </div>
        </div>
      ) : (
        // Full Page Chat
        <FullPageChat
          isConsultationStarted={isConsultationStarted}
          onBack={() => setIsConsultationStarted(false)}
        />
      )}
    </div>
  );
}


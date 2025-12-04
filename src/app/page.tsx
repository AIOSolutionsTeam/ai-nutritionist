"use client";

import Link from "next/link";
import Image from "next/image";
import Navigation from "../components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Split-Screen Hero Section - Golden gradient left, image right */}
      <section className="relative min-h-[90vh] flex flex-col lg:flex-row">
        {/* Left Side - Golden Gradient with Text */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-primary/40 via-primary/30 to-background flex items-center justify-center py-20 lg:py-32 px-6 lg:px-16">
          <div className="max-w-2xl animate-fade-in">
            {/* Small decorative label */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bien-être Personnalisé</span>
            </div>
            
            <h1 className="font-serif uppercase tracking-widest text-5xl lg:text-7xl font-light text-foreground mb-6 leading-tight">
              Votre Assistant Santé Personnel
            </h1>
            
            <p className="text-lg lg:text-xl text-muted-foreground mb-10 leading-relaxed font-light max-w-xl">
              Obtenez des conseils nutritionnels personnalisés, des recommandations de suppléments et des conseils de bien-être adaptés à vos objectifs de santé et à votre mode de vie.
            </p>
            
            {/* CTA Button - Ghost/outline style */}
            <Link
              href="/nutritionniste"
              className="btn-outline inline-block"
            >
              Commencer ma consultation
            </Link>
          </div>
        </div>

        {/* Right Side - Lifestyle/Product Image */}
        <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-secondary/20 via-secondary/10 to-background">
          {/* Vigaia Logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="https://www.vigaia.com/cdn/shop/files/vigaia-high-resolution-logo-transparent.png?v=1757942624&width=240"
              alt="Vigaia Logo"
              width={240}
              height={240}
              className="opacity-20 object-contain"
              priority
            />
          </div>
          {/* Subtle pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-4">Produits en Vedette</span>
            <h2 className="font-serif uppercase tracking-widest text-4xl lg:text-5xl font-light text-foreground mb-6">
              Suppléments Premium
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Découvrez notre sélection de suppléments de haute qualité adaptés à votre parcours de bien-être
            </p>
          </div>

          {/* Product Grid - Borderless floating cards */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[1, 2, 3].map((item, idx) => (
              <div 
                key={item}
                className="premium-card p-10 animate-fade-in hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-3xl mb-6">
                  {item === 1 ? '🍎' : item === 2 ? '💊' : '🎯'}
                </div>
                <h3 className="font-serif uppercase tracking-widest text-xl font-light text-foreground mb-4">
                  {item === 1 ? 'Conseils Nutritionnels' : item === 2 ? 'Conseils en Suppléments' : 'Objectifs de Santé'}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  {item === 1 
                    ? 'Obtenez des recommandations diététiques personnalisées basées sur vos objectifs de santé, vos restrictions alimentaires et vos préférences de mode de vie.'
                    : item === 2
                    ? 'Recevez des recommandations d\'experts sur les vitamines, minéraux et suppléments qui correspondent à vos besoins nutritionnels.'
                    : 'Créez et suivez des objectifs de santé personnalisés avec des étapes concrètes et un suivi des progrès.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us / Benefits Section */}
      <section className="py-20 lg:py-32 bg-card">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-20 animate-fade-in">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground block mb-4">Pourquoi Nous Choisir</span>
            <h2 className="font-serif uppercase tracking-widest text-4xl lg:text-5xl font-light text-foreground mb-6">
              Support Complet pour le Bien-être
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="animate-fade-in">
              <h3 className="font-serif uppercase tracking-widest text-2xl font-light text-foreground mb-4">
                Recommandations Propulsées par l&apos;IA
              </h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Notre IA avancée analyse votre profil unique pour fournir des recommandations personnalisées en suppléments et nutrition.
              </p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h3 className="font-serif uppercase tracking-widest text-2xl font-light text-foreground mb-4">
                Scientifiquement Appuyé
              </h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                Toutes les recommandations sont basées sur la recherche scientifique actuelle et les meilleures pratiques nutritionnelles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section for AI Chat Advisor */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center animate-fade-in">
          <h2 className="font-serif uppercase tracking-widest text-4xl lg:text-5xl font-light text-foreground mb-6">
            Prêt à Commencer Votre Parcours ?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
            Discutez avec notre conseiller en suppléments IA pour obtenir des recommandations personnalisées adaptées à vos besoins uniques.
          </p>
          <Link
            href="/nutritionniste"
            className="btn-outline inline-block"
          >
            Démarrer la Consultation IA
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-banner text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-3">
              Alimenté par une technologie IA avancée
            </p>
            <p className="text-sm text-white/40 font-light">
              Consultez toujours des professionnels de la santé pour des conseils médicaux
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

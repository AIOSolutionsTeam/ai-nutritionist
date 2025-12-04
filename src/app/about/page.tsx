import Navigation from "../../components/Navigation";

export default function About() {
  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-[#F5C842]/10 via-white to-[#FEFDFB]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center animate-fadeInUp">
          <span className="subheading text-[#6B6B6B] block mb-4">À Propos de Nous</span>
          <h1 className="headline text-5xl lg:text-6xl font-light text-[#1A1A1A] mb-8">
            À Propos de Nutritionniste IA
          </h1>
          <p className="text-xl lg:text-2xl text-[#6B6B6B] font-light leading-relaxed max-w-3xl mx-auto">
            Une plateforme intelligente qui fournit des recommandations de suppléments personnalisées basées sur vos objectifs de santé, vos préférences alimentaires et votre mode de vie.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-2xl">✨</span>
            <h2 className="headline text-3xl lg:text-4xl font-light text-[#1A1A1A]">
              Notre Mission
            </h2>
          </div>
          <p className="text-lg text-[#6B6B6B] leading-relaxed font-light ml-10">
            Nous croyons que chacun mérite d&apos;avoir accès à des conseils nutritionnels personnalisés. Notre assistant propulsé par l&apos;IA vous aide à prendre des décisions éclairées concernant les suppléments et la nutrition, soutenu par la recherche scientifique et adapté à vos besoins uniques.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding bg-[#FEFDFB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16 animate-fadeInUp">
            <span className="subheading text-[#6B6B6B] block mb-4">Processus</span>
            <h2 className="headline text-4xl lg:text-5xl font-light text-[#1A1A1A]">
              Comment Ça Marche
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="premium-card p-10 text-center animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              <div className="w-20 h-20 bg-gradient-to-br from-[#F5C842]/20 to-[#F5C842]/10 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">
                1
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Parlez-Nous de Vous
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Partagez vos objectifs de santé, vos restrictions alimentaires et vos préférences de mode de vie.
              </p>
            </div>

            <div className="premium-card p-10 text-center animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <div className="w-20 h-20 bg-gradient-to-br from-[#6B8E6B]/20 to-[#6B8E6B]/10 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">
                2
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Analyse par l&apos;IA
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Notre IA analyse votre profil et la recherche nutritionnelle actuelle.
              </p>
            </div>

            <div className="premium-card p-10 text-center animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              <div className="w-20 h-20 bg-gradient-to-br from-[#F5D5D5]/40 to-[#F5D5D5]/20 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto">
                3
              </div>
              <h3 className="headline text-xl font-light text-[#1A1A1A] mb-4">
                Obtenez des Recommandations
              </h3>
              <p className="text-[#6B6B6B] leading-relaxed font-light">
                Recevez des recommandations personnalisées en suppléments et nutrition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="section-padding bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="premium-card p-10 lg:p-16 bg-gradient-to-br from-[#F5D5D5]/20 to-transparent border border-[#F5D5D5]/30">
            <h2 className="headline text-2xl lg:text-3xl font-light text-[#1A1A1A] mb-6">
              Avertissement Important
            </h2>
            <p className="text-lg text-[#6B6B6B] leading-relaxed font-light">
              Nutritionniste IA fournit uniquement du contenu informatif et n&apos;est pas destiné à servir de conseil médical. Consultez toujours un professionnel de la santé avant de commencer tout nouveau régime de suppléments.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

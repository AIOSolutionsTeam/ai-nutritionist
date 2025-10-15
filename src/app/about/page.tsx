export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          About AI Nutritionist
        </h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 mb-6">
            AI Nutritionist is an intelligent platform that provides
            personalized supplement recommendations based on your health goals,
            dietary preferences, and lifestyle.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Our Mission
          </h2>
          <p className="text-gray-600 mb-6">
            We believe that everyone deserves access to personalized nutrition
            guidance. Our AI-powered assistant helps you make informed decisions
            about supplements and nutrition, backed by scientific research and
            tailored to your unique needs.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">
                1. Tell Us About Yourself
              </h3>
              <p className="text-gray-600">
                Share your health goals, dietary restrictions, and lifestyle
                preferences.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">2. AI Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your profile and current nutrition research.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">
                3. Get Recommendations
              </h3>
              <p className="text-gray-600">
                Receive personalized supplement and nutrition recommendations.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Disclaimer
          </h2>
          <p className="text-gray-600 mb-6">
            AI Nutritionist provides informational content only and is not
            intended as medical advice. Always consult with a healthcare
            professional before starting any new supplement regimen.
          </p>
        </div>
      </div>
    </div>
  );
}

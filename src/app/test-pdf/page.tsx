"use client";

import { useState } from "react";

export default function TestPDFPage() {
  const [userId, setUserId] = useState("test-user-123");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pdfUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(
        "🔍 Frontend: Making request to /api/pdf with userId:",
        userId
      );

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      console.log("📊 Frontend: Response status:", response.status);
      console.log(
        "📊 Frontend: Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      // Get response text first to debug
      const responseText = await response.text();
      console.log(
        "📄 Frontend: Response text (first 200 chars):",
        responseText.substring(0, 200)
      );

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("✅ Frontend: Successfully parsed JSON:", data);
      } catch (parseError) {
        console.error(
          "❌ Frontend: Failed to parse response as JSON:",
          parseError
        );
        console.log("📄 Frontend: Full response text:", responseText);
        throw new Error(
          `Server returned invalid JSON. Response: ${responseText.substring(
            0,
            500
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to generate PDF");
      }

      setResult(data);
    } catch (err) {
      console.error("❌ Frontend: Error in generatePDF:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test PDF Generation
        </h1>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700"
            >
              User ID
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter user ID"
            />
          </div>

          <button
            onClick={generatePDF}
            disabled={loading || !userId}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating PDF..." : "Generate Nutrition Plan PDF"}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-600">
                <strong>Success!</strong> PDF generated successfully.
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <strong>PDF URL:</strong> {result.pdfUrl}
                </p>
                <a
                  href={result.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"
                >
                  View PDF
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Instructions:
          </h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Enter a user ID (or use the default test-user-123)</li>
            <li>Click &quot;Generate Nutrition Plan PDF&quot;</li>
            <li>
              The system will create a sample user profile and generate a PDF
            </li>
            <li>Click &quot;View PDF&quot; to download or view the generated PDF</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

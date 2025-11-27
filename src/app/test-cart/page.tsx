"use client";

import { useState } from "react";

export default function TestCartPage() {
  const [testResult, setTestResult] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");

  const testAddToCart = async () => {
    const id = (variantId || "").trim();
    if (!id) {
      alert("Enter a numeric Shopify variant ID to test.");
      return;
    }

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity: 1 }),
      });

      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testGetCart = async () => {
    try {
      const response = await fetch("/cart.js");
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Cart API Test Page</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Note:</strong> These tests only work when your app is on
                a Shopify domain (via App Proxy) or when Shopify Cart API is
                accessible. On localhost, use the chat to trigger the built-in
                test mode alerts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numeric Variant ID
                </label>
                <input
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                onClick={testAddToCart}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Test Add to Cart
              </button>
              <button
                onClick={testGetCart}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Test Get Cart
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {testResult}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            ⚠️ Testing Instructions
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>
              In development (localhost), the chat uses a test alert to simulate
              add-to-cart.
            </li>
            <li>
              On a Shopify domain (via App Proxy), it will add to the real cart.
            </li>
            <li>Check the browser console for detailed logs.</li>
            <li>Use valid numeric variant IDs from your Shopify store.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


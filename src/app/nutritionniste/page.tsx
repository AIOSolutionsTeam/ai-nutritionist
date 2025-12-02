"use client";

import FullPageChat from "../../components/FullPageChat";
import Navigation from "../../components/Navigation";

export default function NutritionnistePage() {
  return (
    <div className="min-h-screen bg-[#FEFDFB] flex flex-col">
      <Navigation />
      <FullPageChat
        isConsultationStarted={true}
        onBack={() => {
          // Navigate back to homepage if needed
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }}
      />
    </div>
  );
}


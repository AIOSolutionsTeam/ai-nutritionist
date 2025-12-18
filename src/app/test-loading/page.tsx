"use client";

import { useState } from "react";
import Image from "next/image";

export default function TestLoadingAnimation() {
  // Animation state
  const [logoRotationEnabled, setLogoRotationEnabled] = useState(false);
  const [logoRotationSpeed, setLogoRotationSpeed] = useState(1.5);
  const [circleRotationEnabled, setCircleRotationEnabled] = useState(false);
  const [circleRotationSpeed, setCircleRotationSpeed] = useState(1.5);
  
  // Ping animation state
  const [pingSpeed, setPingSpeed] = useState(2);
  const [pingDelay1, setPingDelay1] = useState(0);
  const [pingDelay2, setPingDelay2] = useState(0.7);
  
  // Color state
  const [ring1Color, setRing1Color] = useState("primary");
  const [ring1Opacity, setRing1Opacity] = useState(50);
  const [ring2Color, setRing2Color] = useState("primary");
  const [ring2Opacity, setRing2Opacity] = useState(35);
  const [circleBgColor, setCircleBgColor] = useState("primary");
  const [circleBgOpacity, setCircleBgOpacity] = useState(10);
  
  // Size state
  const [logoWidth, setLogoWidth] = useState(56);
  const [logoHeight, setLogoHeight] = useState(56);
  const [circleSize, setCircleSize] = useState(24);
  const [innerCircleSize, setInnerCircleSize] = useState(14);
  
  // Get color class based on selection
  const getColorClass = (color: string, opacity: number) => {
    const colorMap: { [key: string]: string } = {
      primary: "border-primary",
      secondary: "border-secondary",
      accent: "border-accent",
      foreground: "border-foreground",
    };
    return `${colorMap[color] || "border-primary"}/${opacity}`;
  };
  
  const getBgColorClass = (color: string, opacity: number) => {
    const colorMap: { [key: string]: string } = {
      primary: "bg-primary",
      secondary: "bg-secondary",
      accent: "bg-accent",
      foreground: "bg-foreground",
    };
    return `${colorMap[color] || "bg-primary"}/${opacity}`;
  };
  
  // Generate output code
  const generateOutput = () => {
    const logoStyle = logoRotationEnabled
      ? `style={{ animation: 'spin ${logoRotationSpeed}s linear infinite' }}`
      : "";
    
    const circleStyle = circleRotationEnabled
      ? `style={{ animation: 'spin ${circleRotationSpeed}s linear infinite' }}`
      : "";
    
    const ring1Style = `style={{ animationDuration: "${pingSpeed}s", animationDelay: "${pingDelay1}s" }}`;
    const ring2Style = `style={{ animationDuration: "${pingSpeed}s", animationDelay: "${pingDelay2}s" }}`;
    
    const circleSizePx = circleSize * 4;
    const innerCircleSizePx = innerCircleSize * 4;
    
    return `{/* Animated Logo/Icon */}
<div className="relative"${circleStyle ? ` ${circleStyle}` : ""}>
  <div 
    className="rounded-full ${getBgColorClass(circleBgColor, circleBgOpacity)} flex items-center justify-center"
    style={{ width: "${circleSizePx}px", height: "${circleSizePx}px" }}
  >
    <div 
      className="relative flex items-center justify-center"
      style={{ width: "${innerCircleSizePx}px", height: "${innerCircleSizePx}px" }}
    >
      <Image
        src="https://www.vigaia.com/cdn/shop/files/vigaia-high-resolution-logo-transparent_06884d1a-0548-44bc-932e-1cad07cb1f1d.png?crop=center&height=32&v=1758274822&width=32"
        alt="Vigaia AI"
        width={${logoWidth}}
        height={${logoHeight}}
        className="object-contain"${logoStyle ? ` ${logoStyle}` : ""}
      />
    </div>
  </div>
  {/* Pulsing rings */}
  <div className="absolute inset-0 rounded-full border-2 ${getColorClass(ring1Color, ring1Opacity)} animate-ping" ${ring1Style}></div>
  <div className="absolute inset-0 rounded-full border-2 ${getColorClass(ring2Color, ring2Opacity)} animate-ping" ${ring2Style}></div>
</div>

// Configuration Values:
// Logo rotation: ${logoRotationEnabled ? `enabled (${logoRotationSpeed}s)` : "disabled"}
// Circle rotation: ${circleRotationEnabled ? `enabled (${circleRotationSpeed}s)` : "disabled"}
// Ping speed: ${pingSpeed}s
// Ring 1: ${ring1Color}/${ring1Opacity}, delay: ${pingDelay1}s
// Ring 2: ${ring2Color}/${ring2Opacity}, delay: ${pingDelay2}s
// Circle bg: ${circleBgColor}/${circleBgOpacity}
// Logo size: ${logoWidth}x${logoHeight}px
// Circle size: ${circleSizePx}px (${circleSize} * 4)
// Inner circle size: ${innerCircleSizePx}px (${innerCircleSize} * 4)`;
  };
  
  const outputCode = generateOutput();
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputCode);
    alert("Code copied to clipboard!");
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif uppercase tracking-widest mb-2">
            Loading Animation Tester
          </h1>
          <p className="text-muted-foreground">
            Adjust the controls below to customize the loading animation
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="bg-card border border-muted rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-serif uppercase tracking-widest mb-4">
              Controls
            </h2>
            
            {/* Logo Rotation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Logo Rotation</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logoRotationEnabled}
                    onChange={(e) => setLogoRotationEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              {logoRotationEnabled && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    Speed: {logoRotationSpeed}s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={logoRotationSpeed}
                    onChange={(e) => setLogoRotationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
            
            {/* Circle Rotation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Circle Rotation</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={circleRotationEnabled}
                    onChange={(e) => setCircleRotationEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              {circleRotationEnabled && (
                <div>
                  <label className="text-xs text-muted-foreground">
                    Speed: {circleRotationSpeed}s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={circleRotationSpeed}
                    onChange={(e) => setCircleRotationSpeed(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
            
            {/* Ping Speed */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Ping Speed: {pingSpeed}s
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={pingSpeed}
                onChange={(e) => setPingSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Ping Delays */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Ping Delays</label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Ring 1 Delay: {pingDelay1}s
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pingDelay1}
                    onChange={(e) => setPingDelay1(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Ring 2 Delay: {pingDelay2}s
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pingDelay2}
                    onChange={(e) => setPingDelay2(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
            
            {/* Ring Colors */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Ring 1 Color</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={ring1Color}
                  onChange={(e) => setRing1Color(e.target.value)}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="accent">Accent</option>
                  <option value="foreground">Foreground</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ring1Opacity}
                  onChange={(e) => setRing1Opacity(parseInt(e.target.value))}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                  placeholder="Opacity"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Ring 2 Color</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={ring2Color}
                  onChange={(e) => setRing2Color(e.target.value)}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="accent">Accent</option>
                  <option value="foreground">Foreground</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ring2Opacity}
                  onChange={(e) => setRing2Opacity(parseInt(e.target.value))}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                  placeholder="Opacity"
                />
              </div>
            </div>
            
            {/* Circle Background Color */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Circle Background</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={circleBgColor}
                  onChange={(e) => setCircleBgColor(e.target.value)}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="accent">Accent</option>
                  <option value="foreground">Foreground</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={circleBgOpacity}
                  onChange={(e) => setCircleBgOpacity(parseInt(e.target.value))}
                  className="px-3 py-2 border border-muted rounded-lg bg-background text-sm"
                  placeholder="Opacity"
                />
              </div>
            </div>
            
            {/* Logo Size */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Logo Size</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Width: {logoWidth}px</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="2"
                    value={logoWidth}
                    onChange={(e) => setLogoWidth(parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Height: {logoHeight}px</label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="2"
                    value={logoHeight}
                    onChange={(e) => setLogoHeight(parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
            
            {/* Circle Size */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Circle Size (w-{circleSize} h-{circleSize})</label>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={circleSize}
                onChange={(e) => setCircleSize(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            {/* Inner Circle Size */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Inner Circle Size (w-{innerCircleSize} h-{innerCircleSize})</label>
              <input
                type="range"
                min="8"
                max="20"
                step="1"
                value={innerCircleSize}
                onChange={(e) => setInnerCircleSize(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="bg-card border border-muted rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-serif uppercase tracking-widest mb-4">
              Preview
            </h2>
            
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-background rounded-lg border border-muted">
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Animated Logo/Icon */}
                <div
                  className="relative"
                  style={
                    circleRotationEnabled
                      ? {
                          animation: `spin ${circleRotationSpeed}s linear infinite`,
                        }
                      : {}
                  }
                >
                  <div
                    className={`rounded-full ${getBgColorClass(circleBgColor, circleBgOpacity)} flex items-center justify-center`}
                    style={{
                      width: `${circleSize * 4}px`,
                      height: `${circleSize * 4}px`,
                    }}
                  >
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        width: `${innerCircleSize * 4}px`,
                        height: `${innerCircleSize * 4}px`,
                      }}
                    >
                      <Image
                        src="https://www.vigaia.com/cdn/shop/files/vigaia-high-resolution-logo-transparent_06884d1a-0548-44bc-932e-1cad07cb1f1d.png?crop=center&height=32&v=1758274822&width=32"
                        alt="Vigaia AI"
                        width={logoWidth}
                        height={logoHeight}
                        className="object-contain"
                        style={
                          logoRotationEnabled
                            ? {
                                animation: `spin ${logoRotationSpeed}s linear infinite`,
                              }
                            : {}
                        }
                      />
                    </div>
                  </div>
                  {/* Pulsing rings */}
                  <div
                    className={`absolute inset-0 rounded-full border-2 ${getColorClass(ring1Color, ring1Opacity)} animate-ping`}
                    style={{
                      animationDuration: `${pingSpeed}s`,
                      animationDelay: `${pingDelay1}s`,
                    }}
                  ></div>
                  <div
                    className={`absolute inset-0 rounded-full border-2 ${getColorClass(ring2Color, ring2Opacity)} animate-ping`}
                    style={{
                      animationDuration: `${pingSpeed}s`,
                      animationDelay: `${pingDelay2}s`,
                    }}
                  ></div>
                </div>
                
                {/* Loading Text */}
                <div className="text-center space-y-2">
                  <h2 className="font-serif uppercase tracking-widest text-lg sm:text-xl font-light text-foreground">
                    Assistante virtuelle
                  </h2>
                  <p className="text-sm text-muted-foreground uppercase tracking-[0.15em]">
                    Initialisation en cours...
                  </p>
                </div>
                
                {/* Loading Dots */}
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Output Panel */}
        <div className="bg-card border border-muted rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif uppercase tracking-widest">
              Output Code & Values
            </h2>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-light uppercase tracking-[0.1em] hover:bg-primary/90 transition-all duration-300"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
              {outputCode}
            </pre>
          </div>
          
          {/* Values Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Logo Rotation</div>
              <div className="text-sm font-medium">
                {logoRotationEnabled ? `${logoRotationSpeed}s` : "Off"}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Circle Rotation</div>
              <div className="text-sm font-medium">
                {circleRotationEnabled ? `${circleRotationSpeed}s` : "Off"}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Ping Speed</div>
              <div className="text-sm font-medium">{pingSpeed}s</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Logo Size</div>
              <div className="text-sm font-medium">
                {logoWidth}×{logoHeight}px
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Ring 1</div>
              <div className="text-sm font-medium">
                {ring1Color}/{ring1Opacity}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Ring 2</div>
              <div className="text-sm font-medium">
                {ring2Color}/{ring2Opacity}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Circle BG</div>
              <div className="text-sm font-medium">
                {circleBgColor}/{circleBgOpacity}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Circle Size</div>
              <div className="text-sm font-medium">w-{circleSize} h-{circleSize}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


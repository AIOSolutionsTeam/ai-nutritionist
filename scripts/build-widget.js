#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the widget file
const widgetPath = path.join(__dirname, '../public/widget.js');
const widgetContent = fs.readFileSync(widgetPath, 'utf8');

// Minify the JavaScript (basic minification)
function minifyJS(code) {
     return code
          // Remove comments
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          // Remove extra whitespace
          .replace(/\s+/g, ' ')
          .replace(/\s*([{}();,=])\s*/g, '$1')
          .trim();
}

// Create minified version
const minifiedContent = minifyJS(widgetContent);

// Write minified version
const minifiedPath = path.join(__dirname, '../public/widget.min.js');
fs.writeFileSync(minifiedPath, minifiedContent);

console.log('✅ Widget built successfully!');
console.log(`📦 Original size: ${(widgetContent.length / 1024).toFixed(2)} KB`);
console.log(`📦 Minified size: ${(minifiedContent.length / 1024).toFixed(2)} KB`);
console.log(`📦 Compression: ${((1 - minifiedContent.length / widgetContent.length) * 100).toFixed(1)}%`);

// Create a simple HTML test file
const testHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vigaia Chat Widget Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .demo-content {
            margin: 40px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥗 Vigaia AI Nutritionist Chat Widget</h1>
        <div class="demo-content">
            <h2>Demo Page</h2>
            <p>This is a test page to demonstrate the Vigaia Chat Widget. The widget should appear as a floating button in the bottom-right corner.</p>
            <p>Click the button to open the chat interface and test the functionality.</p>
            
            <h3>Features:</h3>
            <ul>
                <li>✅ Responsive design (mobile & desktop)</li>
                <li>✅ AI-powered nutrition advice</li>
                <li>✅ Product recommendations</li>
                <li>✅ Add to cart functionality</li>
                <li>✅ Smooth animations</li>
            </ul>
        </div>
    </div>

    <!-- Load the widget -->
    <script src="./widget.min.js"></script>
    
    <!-- Optional: Configure the widget -->
    <script>
        // Example configuration (optional)
        if (window.vigaiaChatWidget) {
            // Widget is auto-initialized
            console.log('Vigaia Chat Widget loaded successfully!');
        }
    </script>
</body>
</html>`;

const testPath = path.join(__dirname, '../public/test.html');
fs.writeFileSync(testPath, testHTML);

console.log('📄 Test HTML created: public/test.html');
console.log('🌐 Open public/test.html in your browser to test the widget');

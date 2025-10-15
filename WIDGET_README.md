# 🥗 Vigaia AI Nutritionist Chat Widget

A responsive, embeddable chat widget that provides AI-powered nutrition advice and product recommendations. Perfect for Shopify stores and any website.

## ✨ Features

- **🤖 AI-Powered**: Intelligent nutrition advice using advanced AI models
- **📱 Responsive**: Works perfectly on mobile and desktop devices
- **🛍️ Product Integration**: Shows product recommendations with "Add to Cart" functionality
- **🎨 Customizable**: Easy to customize colors, positioning, and behavior
- **⚡ Lightweight**: Optimized for fast loading and minimal impact
- **🔧 Easy Integration**: Simple script tag installation

## 🚀 Quick Start

### 1. Basic Installation

Add this script tag to your website's `<head>` or before the closing `</body>` tag:

```html
<script src="https://chat.vigaia.ai/widget.min.js"></script>
```

That's it! The widget will automatically initialize and appear in the bottom-right corner.

### 2. Shopify Integration

For Shopify stores, add the script to your theme:

**Option A: Via Theme Customizer**

1. Go to Online Store > Themes
2. Click "Customize" on your active theme
3. Go to Theme Settings > Custom Code
4. Add the script to "Additional content for <head> tag"

**Option B: Via theme.liquid**
Add this to your `theme.liquid` file before `</head>`:

```liquid
<script src="https://chat.vigaia.ai/widget.min.js"></script>
```

**Option C: Via Shopify Script Tag API**

```javascript
fetch("/admin/api/2023-10/script_tags.json", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": "your-access-token",
  },
  body: JSON.stringify({
    script_tag: {
      event: "onload",
      src: "https://chat.vigaia.ai/widget.min.js",
    },
  }),
});
```

## ⚙️ Configuration

### Data Attributes

You can configure the widget using data attributes on the script tag:

```html
<script
  src="https://chat.vigaia.ai/widget.min.js"
  data-api-url="https://your-api.com/chat"
  data-primary-color="#10b981"
  data-position-bottom="24px"
  data-position-right="24px"
></script>
```

### Available Options

| Attribute              | Description           | Default                           |
| ---------------------- | --------------------- | --------------------------------- |
| `data-api-url`         | API endpoint for chat | `https://chat.vigaia.ai/api/chat` |
| `data-primary-color`   | Primary theme color   | `#10b981`                         |
| `data-position-bottom` | Distance from bottom  | `24px`                            |
| `data-position-right`  | Distance from right   | `24px`                            |

### JavaScript API

You can also control the widget programmatically:

```javascript
// Open the chat widget
window.vigaiaChatWidget.open();

// Close the chat widget
window.vigaiaChatWidget.close();

// Send a message programmatically
window.vigaiaChatWidget.sendMessage("Hello, I need nutrition advice");

// Initialize with custom config
const widget = new VigaiaChatWidget({
  apiUrl: "https://your-api.com/chat",
  theme: {
    primaryColor: "#ff6b6b",
  },
});
```

## 🛍️ Cart Integration

The widget includes "Add to Cart" functionality for product recommendations. To integrate with your cart system:

### Shopify Cart Integration

```javascript
// The widget will automatically detect Shopify and use the cart API
// No additional configuration needed for Shopify stores
```

### Custom Cart Integration

Override the `addToCart` method:

```javascript
window.vigaiaChatWidget.addToCart = function (variantId) {
  // Your custom cart logic here
  fetch("/cart/add.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: variantId, quantity: 1 }),
  }).then((response) => {
    if (response.ok) {
      alert("Product added to cart!");
    }
  });
};
```

## 📱 Responsive Design

The widget automatically adapts to different screen sizes:

- **Desktop**: 384px wide chat window
- **Mobile**: Full-width chat window (with margins)
- **Button**: Scales appropriately for touch targets

## 🎨 Customization

### CSS Custom Properties

You can override the widget's appearance using CSS:

```css
.vigaia-chat-widget {
  --primary-color: #your-color;
  --primary-light: #your-light-color;
  --primary-dark: #your-dark-color;
}
```

### Theme Colors

```javascript
const widget = new VigaiaChatWidget({
  theme: {
    primaryColor: "#10b981",
    primaryColorLight: "#34d399",
    primaryColorDark: "#059669",
  },
});
```

## 🔧 Development

### Building the Widget

```bash
# Build the widget for production
npm run build-widget

# Test the widget locally
npm run test-widget
```

### File Structure

```
public/
├── widget.js          # Development version
├── widget.min.js      # Production version (minified)
└── test.html          # Test page

scripts/
└── build-widget.js    # Build script
```

## 📊 Analytics & Tracking

The widget automatically tracks interactions. You can access analytics data:

```javascript
// Track widget events
window.addEventListener("vigaia-chat-event", (event) => {
  console.log("Chat event:", event.detail);
  // event.detail.type: 'open', 'close', 'message', 'product_click'
});
```

## 🛡️ Security

- All API calls use HTTPS
- No sensitive data is stored locally
- Widget is sandboxed and doesn't interfere with your site's functionality
- CSP (Content Security Policy) friendly

## 🐛 Troubleshooting

### Widget Not Appearing

1. Check browser console for errors
2. Ensure the script URL is accessible
3. Verify no CSP restrictions are blocking the script

### API Errors

1. Check the `data-api-url` attribute
2. Ensure your API endpoint is CORS-enabled
3. Verify API authentication if required

### Styling Issues

1. Check for CSS conflicts with your theme
2. Use browser dev tools to inspect widget styles
3. Override styles using CSS custom properties

## 📞 Support

For support and questions:

- 📧 Email: support@vigaia.ai
- 📚 Documentation: https://docs.vigaia.ai
- 🐛 Issues: https://github.com/vigaia/chat-widget/issues

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ by the Vigaia team**

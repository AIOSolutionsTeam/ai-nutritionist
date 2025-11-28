# Shopify Cart Integration Guide

This guide explains how to integrate the AI Nutritionist app with Shopify's cart system so that products can be added to the cart when users click "Ajouter au panier" (Add to Cart).

## How It Works

The app automatically detects the integration scenario and uses the appropriate method:

1. **Direct Shopify Domain (App Proxy)** - Uses `/cart/add.js` directly
2. **Iframe Embedded in Shopify** - Uses `postMessage` to communicate with the parent Shopify page
3. **External Domain** - Provides helpful error messages

## Integration Methods

### Method 1: Iframe Integration (Recommended for Full-Page Experience)

When embedding the app in a Shopify page using an iframe, you need to add a message handler to the Shopify theme.

#### Step 1: Create the Shopify Page

1. In Shopify Admin: **Online Store → Pages → Add page**
2. Title: "Consultation Nutritionniste" (or your preferred title)
3. Template: Create a custom template (see Step 2)

#### Step 2: Create Page Template

Create a new template file: `templates/page.nutritionniste.liquid`

```liquid
{% comment %}
  Nutritionniste Consultation Page Template
  Embeds the AI Nutritionist app in an iframe
{% endcomment %}

<div class="nutrition-iframe-container" style="width: 100%; height: 100vh; min-height: 800px;">
  <iframe 
    id="nutritionist-iframe"
    src="https://your-deployed-app.com/nutritionniste"
    width="100%"
    height="100%"
    frameborder="0"
    style="border: none; min-height: 800px;">
  </iframe>
</div>

{% comment %}
  Add to Cart Handler for iframe communication
  This script handles cart requests from the embedded app
{% endcomment %}
<script>
  (function() {
    // Listen for messages from the iframe
    window.addEventListener('message', function(event) {
      // Security: In production, validate event.origin against your app domain
      // if (event.origin !== 'https://your-deployed-app.com') return;
      
      // Handle add to cart requests
      if (event.data && event.data.type === 'shopify-add-to-cart') {
        const { requestId, variantId, quantity } = event.data;
        
        // Use Shopify's Cart API to add the product
        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: quantity || 1
          })
        })
        .then(response => response.json())
        .then(data => {
          // Check for errors
          if (data.status === 422) {
            // Send error response back to iframe
            event.source.postMessage({
              type: 'shopify-cart-response',
              requestId: requestId,
              success: false,
              message: 'Désolé, ce produit n\'est pas disponible.'
            }, event.origin);
            return;
          }
          
          // Get updated cart
          return fetch('/cart.js')
            .then(response => response.json())
            .then(cart => {
              // Send success response back to iframe
              event.source.postMessage({
                type: 'shopify-cart-response',
                requestId: requestId,
                success: true,
                message: 'Produit ajouté au panier! 🛒',
                cart: {
                  item_count: cart.item_count
                }
              }, event.origin);
              
              // Update cart count in theme (if your theme supports it)
              const cartCountElements = document.querySelectorAll('.cart-count, [data-cart-count]');
              cartCountElements.forEach(el => {
                el.textContent = cart.item_count;
              });
              
              // Dispatch custom event for theme integration
              window.dispatchEvent(new CustomEvent('cart:updated', {
                detail: { item_count: cart.item_count }
              }));
            });
        })
        .catch(error => {
          console.error('Error adding to cart:', error);
          // Send error response back to iframe
          event.source.postMessage({
            type: 'shopify-cart-response',
            requestId: requestId,
            success: false,
            message: 'Désolé, une erreur s\'est produite lors de l\'ajout au panier.'
          }, event.origin);
        });
      }
    });
  })();
</script>
```

#### Step 3: Assign Template to Page

1. In the page editor, select **Template: page.nutritionniste**
2. Save the page

#### Step 4: Add Navigation Link (Optional)

1. **Theme → Navigation → Main menu**
2. Add a link to your new page

---

### Method 2: App Proxy Integration (Advanced)

For a more seamless integration, you can set up a Shopify App Proxy so the app is served under your Shopify domain.

#### Benefits:
- No iframe needed
- Direct access to `/cart/add.js` API
- Better SEO
- No cross-origin issues

#### Setup Steps:

1. **Create a Shopify App** (if you don't have one)
   - Go to: **Apps → App and sales channel settings → Develop apps → Create an app**
   - Name: "AI Nutritionist"

2. **Configure App Proxy**
   - In your app settings, go to **App Proxy**
   - Subpath prefix: `nutritionniste`
   - Subpath: `nutritionniste`
   - Proxy URL: `https://your-deployed-app.com`

3. **Update Your App**
   - The app will now be accessible at: `https://your-store.myshopify.com/nutritionniste`
   - The cart API will work directly without postMessage

---

### Method 3: Widget Integration (Simplest)

For a floating chat widget on all pages, use the widget script.

#### Step 1: Add Widget Script to Theme

In `theme.liquid`, add before `</head>`:

```liquid
<script src="https://your-deployed-app.com/widget.min.js"></script>
```

#### Step 2: Configure Cart Integration (Optional)

The widget automatically detects Shopify and uses the cart API. If you need custom behavior:

```liquid
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.vigaiaChatWidget) {
      // Override add to cart if needed
      window.vigaiaChatWidget.addToCart = function(variantId) {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: 1 })
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 422) {
            alert('Désolé, ce produit n\'est pas disponible.');
          } else {
            alert('Produit ajouté au panier! 🛒');
            // Update cart count
            fetch('/cart.js')
              .then(response => response.json())
              .then(cart => {
                const cartCount = document.querySelector('.cart-count');
                if (cartCount) {
                  cartCount.textContent = cart.item_count;
                }
              });
          }
        });
      };
    }
  });
</script>
```

---

## Testing

### Test Add to Cart Functionality

1. **Get a Variant ID** from your Shopify store:
   - Go to a product page
   - View page source
   - Look for `variant_id` or check the product JSON

2. **Test in Development**:
   - Visit: `http://localhost:3000/test-cart`
   - Enter a variant ID
   - Click "Test Add to Cart"

3. **Test in Production**:
   - Open browser console
   - Check for any CORS or postMessage errors
   - Verify cart updates after adding products

---

## Troubleshooting

### Products Not Adding to Cart

**Issue**: Clicking "Add to Cart" shows an error

**Solutions**:
1. **Iframe Integration**: Ensure the postMessage handler is added to your theme
2. **Variant ID Format**: Ensure you're using numeric variant IDs (not GraphQL IDs)
3. **CORS Errors**: If using external domain, set up App Proxy or use iframe method
4. **Product Availability**: Check that the variant exists and is available

### Cart Count Not Updating

**Issue**: Products are added but cart count doesn't update

**Solution**: Add cart count update code to your theme:

```javascript
window.addEventListener('cart:updated', function(event) {
  const cartCount = event.detail.item_count;
  // Update your theme's cart count element
  document.querySelector('.cart-count').textContent = cartCount;
});
```

### PostMessage Not Working

**Issue**: Iframe integration not communicating with parent

**Solutions**:
1. Check browser console for errors
2. Verify the postMessage handler is in the correct template
3. Ensure the iframe `src` matches your deployed app URL
4. Check that `event.origin` validation isn't blocking messages (in development, you may need to comment it out)

---

## Security Considerations

1. **Origin Validation**: In production, always validate `event.origin` in postMessage handlers:
   ```javascript
   if (event.origin !== 'https://your-deployed-app.com') return;
   ```

2. **Variant ID Validation**: Validate variant IDs before adding to cart

3. **Rate Limiting**: Consider implementing rate limiting for cart operations

---

## Support

For issues or questions:
- Check the browser console for errors
- Verify your integration method matches one of the scenarios above
- Ensure your Shopify store has the correct permissions

---

## Quick Reference

| Integration Method | Best For | Setup Complexity |
|-------------------|----------|------------------|
| Widget | Quick access on all pages | ⭐ Easy |
| Iframe | Full-page experience | ⭐⭐ Medium |
| App Proxy | Seamless integration | ⭐⭐⭐ Advanced |


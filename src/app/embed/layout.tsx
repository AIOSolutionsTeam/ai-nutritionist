export default function EmbedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                {/* Allow embedding in Shopify iframe */}
                <meta httpEquiv="X-Frame-Options" content="ALLOWALL" />
            </head>
            <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                {children}
            </body>
        </html>
    );
}

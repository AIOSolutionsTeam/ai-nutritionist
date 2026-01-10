import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Assistante Virtuelle | Vigaia",
    description: "Votre assistante nutritionnelle personnalisée",
};

export default function EmbedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
            <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
                {children}
            </body>
        </html>
    );
}

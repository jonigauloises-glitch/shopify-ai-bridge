export const metadata = {
  title: 'Shopify AI Bridge',
  description: 'OpenAI → Printful Bridge für Shopify',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
        {children}
      </body>
    </html>
  );
}

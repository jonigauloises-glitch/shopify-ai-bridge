export default function Home() {
  return (
    <main style={{padding:20,fontFamily:"system-ui"}}>
      <h1>Shopify AI Bridge</h1>
      <p>Backend läuft! Endpunkte:</p>
      <ul>
        <li>POST /api/generate</li>
        <li>POST /api/shopify/orders-paid</li>
      </ul>
    </main>
  );
}

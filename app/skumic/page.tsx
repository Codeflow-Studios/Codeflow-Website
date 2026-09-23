export default function SkumicPage() {
  const gameUrl = process.env.SITEGROUND_STATIC_EXPORT === "1"
    ? "https://codeflow-studios-production.up.railway.app/skumic-game/"
    : "/skumic-game/index.html";
  return (
    <main style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", background: "#111" }}>
      <iframe
        src={gameUrl}
        title="Skumic Fighters 32-bit"
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}

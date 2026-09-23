export default function SkumicPage() {
  return (
    <main style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", background: "#111" }}>
      <iframe
        src="/skumic-game/index.html"
        title="Skumic Fighters 32-bit"
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}

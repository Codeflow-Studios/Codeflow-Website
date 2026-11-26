export default function SkumicGamePage({ title, src }: { title: string; src: string }) {
  return (
    <main style={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateRows: '48px minmax(0, 1fr)', background: '#020105' }}>
      <nav aria-label="Skumic game" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 20px', color: '#f8f0ff', fontSize: '0.875rem' }}>
        <a href="/skumic/arcade/" style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Skumic Arcade</a>
        <span>{title}</span>
      </nav>
      <iframe src={src} title={title} allow="autoplay; fullscreen; gamepad" allowFullScreen style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </main>
  );
}

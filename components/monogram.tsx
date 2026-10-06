import { Scissors } from "lucide-react";

export function Monogram({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`monogram ${compact ? "monogram-compact" : ""}`} aria-label="Studio Capricho Hair">
      <span>CH</span>
      <Scissors aria-hidden="true" />
    </div>
  );
}

export function FloatingRibbonLogo() {
  return (
    <div className="floating-ribbon-logo" aria-label="Studio Capricho Hair">
      <span className="ribbon-knot" aria-hidden="true" />
      <span className="ribbon-loop ribbon-loop-left" aria-hidden="true" />
      <span className="ribbon-loop ribbon-loop-right" aria-hidden="true" />
      <span className="ribbon-tail ribbon-tail-left" aria-hidden="true" />
      <span className="ribbon-tail ribbon-tail-right" aria-hidden="true" />
      <span className="ribbon-name">Studio</span>
      <strong>Capricho Hair</strong>
    </div>
  );
}

export function StudioWordmark() {
  return (
    <div className="studio-wordmark" aria-label="Studio Capricho Hair">
      <span className="studio-wordmark-script">Studio</span>
      <span className="studio-wordmark-name">Capricho Hair</span>
      <i aria-hidden="true"><Scissors /></i>
    </div>
  );
}

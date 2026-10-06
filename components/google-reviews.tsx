"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";

const mapsUrl = "https://maps.app.goo.gl/9Q5wyxuLAivPCLnA8?g_st=ic";
// Transcribed from the Google Maps recording supplied on 06/10/2026.
// Selected excerpts only; not an aggregate rating or a live Google feed.
const reviews = [
  { author: "Oficina Diversao e Alegria", initials: "OA", text: "Super indico trabalho e atendimento maravilhoso mãos abençoada meu cabelo ficou maravilhosamente lindo ✨ ❤️ 🥰" },
  { author: "Agata Rayane", initials: "AR", text: "O atendimento é perfeito, a profissional entrega um resultado maravilhoso!!" },
  { author: "Maria Clara Silva Mariano", initials: "MC", text: "Super atenciosa, atendimento 10 e resultado 100000" },
];

export function GoogleReviews() {
  const [index, setIndex] = useState(0);
  const review = reviews[index];
  return (
    <section className="google-reviews-section" aria-labelledby="google-reviews-title">
      <div className="google-reviews-intro">
        <span className="eyebrow">Avaliações no Google Maps</span>
        <h2 id="google-reviews-title">O carinho de quem já passou por aqui.</h2>
        <p>Experiências compartilhadas pelas nossas clientes.</p>
        <a className="button button-gold" href={mapsUrl} target="_blank" rel="noopener noreferrer">Avaliar no Google Maps <ExternalLink size={16} /></a>
        <small>O botão abre o perfil do Studio para você deixar sua avaliação.</small>
      </div>
      <div className="google-review-carousel" role="region" aria-roledescription="carrossel" aria-label="Depoimentos das clientes">
        <article className="google-review-card" aria-live="polite" aria-atomic="true">
          <div className="google-review-source"><span>Google Maps</span><span role="img" aria-label="5 de 5 estrelas">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} fill="currentColor" aria-hidden="true" />)}</span></div>
          <blockquote>“{review.text}”</blockquote>
          <div className="google-review-author"><span aria-hidden="true">{review.initials}</span><div><strong>{review.author}</strong><small>Avaliação publicada no Google Maps</small></div></div>
        </article>
        <div className="google-review-controls">
          <button aria-label="Avaliação anterior" onClick={() => setIndex((index + reviews.length - 1) % reviews.length)}><ChevronLeft /></button>
          <span>{index + 1} / {reviews.length}</span>
          <button aria-label="Próxima avaliação" onClick={() => setIndex((index + 1) % reviews.length)}><ChevronRight /></button>
        </div>
        <p className="google-review-note">Trechos selecionados de avaliações do Google Maps. Seleção de 06/10/2026.</p>
      </div>
    </section>
  );
}

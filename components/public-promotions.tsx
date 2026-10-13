"use client";

import { CalendarDays, Sparkles } from "lucide-react";
import { dateBR, money } from "@/lib/supabase";
import { promotionSpotlight, studioToday } from "@/lib/promotions";
import type { Promotion, Service } from "@/lib/types";

export function PublicPromotions({ promotions, services, select }: { promotions: Promotion[]; services: Service[]; select: (service: Service, offer: Promotion) => void }) {
  const today = studioToday();
  const offers = promotions.filter((offer) => offer.active && offer.end_date >= today && services.some((service) => service.id === offer.service_id && service.active && Number(offer.promotional_price) < Number(service.price)));
  const spotlight = promotionSpotlight(offers, today);
  if (!spotlight) return null;
  const featured = spotlight.offer;
  const featuredService = services.find((service) => service.id === featured.service_id)!;
  const otherOffers = offers.filter((offer) => offer.id !== featured.id);
  const discount = Math.floor((1 - Number(featured.promotional_price) / Number(featuredService.price)) * 100 + 1e-9);
  return <section className="public-promotions" aria-labelledby="promotions-title">
    <article className="promotion-spotlight">
      <div className="promotion-spotlight-copy">
        <span className="promotion-spotlight-label"><Sparkles size={16} /> {spotlight.label}</span>
        <h2 id="promotions-title">{featuredService.name}</h2>
        <p className="promotion-spotlight-title">{featured.title}</p>
        {featured.description && <p>{featured.description}</p>}
        <span className="promotion-spotlight-date"><CalendarDays size={16} /> {dateBR(featured.start_date)}{featured.end_date !== featured.start_date && ` a ${dateBR(featured.end_date)}`}</span>
      </div>
      <div className="promotion-spotlight-action">
        {discount > 0 && <span className="promotion-discount">{discount}% de desconto</span>}
        <div className="promotion-price"><del>{money(featuredService.price)}</del><strong>{money(featured.promotional_price)}</strong></div>
        <button className="button button-gold" onClick={() => select(featuredService, featured)}>Quero esta promoção</button>
        <small>Válido na data do atendimento, sujeito aos horários disponíveis.</small>
      </div>
    </article>
    {otherOffers.length > 0 && <details className="other-promotions"><summary>Ver outras promoções ({otherOffers.length})</summary><div className="promotion-offers">{otherOffers.map((offer) => {
    const service = services.find((row) => row.id === offer.service_id)!;
    return <article className="promotion-offer" key={offer.id}><span className="eyebrow"><CalendarDays size={15} /> {dateBR(offer.start_date)}{offer.end_date !== offer.start_date && ` a ${dateBR(offer.end_date)}`}</span><h3>{offer.title}</h3><p>{service.name}</p>{offer.description && <p>{offer.description}</p>}<div className="promotion-price"><del>{money(service.price)}</del><strong>{money(offer.promotional_price)}</strong></div><button className="button button-gold" onClick={() => select(service, offer)}>Quero esta promoção</button><small>Sujeito aos horários disponíveis. Desconto válido na data do atendimento.</small></article>;
  })}</div></details>}
  </section>;
}

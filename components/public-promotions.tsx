"use client";

import { CalendarDays } from "lucide-react";
import { dateBR, money } from "@/lib/supabase";
import { studioToday } from "@/lib/promotions";
import type { Promotion, Service } from "@/lib/types";

export function PublicPromotions({ promotions, services, select }: { promotions: Promotion[]; services: Service[]; select: (service: Service, offer: Promotion) => void }) {
  const today = studioToday();
  const offers = promotions.filter((offer) => offer.active && offer.end_date >= today && services.some((service) => service.id === offer.service_id && service.active && Number(offer.promotional_price) < Number(service.price)));
  if (!offers.length) return null;
  return <section className="public-promotions" aria-labelledby="promotions-title"><div><span className="eyebrow">Datas especiais</span><h2 id="promotions-title">Promoções do Studio</h2><p>Escolha a oferta e agende dentro do período indicado.</p></div><div className="promotion-offers">{offers.map((offer) => {
    const service = services.find((row) => row.id === offer.service_id)!;
    return <article className="promotion-offer" key={offer.id}><span className="eyebrow"><CalendarDays size={15} /> {dateBR(offer.start_date)}{offer.end_date !== offer.start_date && ` a ${dateBR(offer.end_date)}`}</span><h3>{offer.title}</h3><p>{service.name}</p>{offer.description && <p>{offer.description}</p>}<div className="promotion-price"><del>{money(service.price)}</del><strong>{money(offer.promotional_price)}</strong></div><button className="button button-gold" onClick={() => select(service, offer)}>Quero esta promoção</button><small>Sujeito aos horários disponíveis. Desconto válido na data do atendimento.</small></article>;
  })}</div></section>;
}

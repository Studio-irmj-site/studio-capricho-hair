import type { Promotion, Service } from "./types";

export function studioToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function promotionalPrice(service: Pick<Service, "id" | "price">, date: string, promotions: Promotion[]) {
  return promotions.reduce((price, promotion) => promotion.active && promotion.service_id === service.id && date >= promotion.start_date && date <= promotion.end_date
    ? Math.min(price, Number(promotion.promotional_price)) : price, Number(service.price));
}

export function validatePromotion(value: Omit<Promotion, "id">, services: Service[]) {
  const service = services.find((row) => row.id === value.service_id && row.active);
  if (!service) throw new Error("Selecione um serviço ativo.");
  if (!value.title.trim() || value.title.length > 100) throw new Error("Informe um título com até 100 caracteres.");
  if ((value.description?.length || 0) > 500) throw new Error("A descrição deve ter até 500 caracteres.");
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  if (!validDate(value.start_date) || !validDate(value.end_date) || value.end_date < value.start_date) throw new Error("Confira as datas da promoção.");
  if (!Number.isFinite(value.promotional_price) || value.promotional_price < 0 || value.promotional_price >= Number(service.price)) throw new Error("O preço promocional deve ser menor que o preço do serviço.");
}

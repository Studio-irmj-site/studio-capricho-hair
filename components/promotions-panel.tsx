"use client";

import { useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dateBR, money } from "@/lib/supabase";
import { studioToday, validatePromotion } from "@/lib/promotions";
import type { Promotion, Service } from "@/lib/types";

type Draft = Omit<Promotion, "id"> & { id?: string };
export function PromotionsPanel({ rows, services, save, remove }: { rows: Promotion[]; services: Service[]; save: (value: Draft) => Promise<void>; remove: (row: Promotion) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const today = studioToday();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || saving) return;
    try {
      validatePromotion(draft, services);
      setSaving(true);
      await save({ ...draft, title: draft.title.trim(), description: draft.description?.trim() || null });
      setDraft(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar a promoção."); }
    finally { setSaving(false); }
  }
  return <>
    <div className="promotion-admin-heading"><div><span className="eyebrow">Campanhas por data</span><h1>Promoções</h1><p>As ofertas ativas aparecem no site das clientes. O desconto vale para a data do atendimento.</p></div><button className="admin-primary" onClick={() => setDraft({ title: "", description: "", service_id: "", start_date: today, end_date: today, promotional_price: 0, active: true })}><Plus /> Nova promoção</button></div>
    <div className="promotion-admin-list">{rows.length ? rows.map((row) => <article className="panel promotion-admin-card" key={row.id}><div><span className="eyebrow">{!row.active ? "Pausada" : row.end_date < today ? "Encerrada" : row.start_date > today ? "Programada" : "Em vigor"}</span><h2>{row.title}</h2><p>{services.find((service) => service.id === row.service_id)?.name || "Serviço indisponível"}</p><small>{dateBR(row.start_date)}{row.end_date !== row.start_date && ` a ${dateBR(row.end_date)}`}</small><strong>{money(row.promotional_price)}</strong></div><div className="card-actions"><button onClick={() => setDraft(row)}><Pencil /> Editar</button><button onClick={() => save({ ...row, active: !row.active }).catch((error) => toast.error(error.message))}>{row.active ? "Pausar" : "Ativar"}</button><button className="danger" onClick={() => remove(row)}><Trash2 /> Excluir</button></div></article>) : <div className="empty-public"><Tag /><h3>Nenhuma promoção cadastrada</h3><p>Escolha um serviço, o preço especial e o dia da oferta.</p></div>}</div>
    <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open && !saving) setDraft(null); }}><DialogContent className="promotion-dialog"><DialogHeader><DialogTitle>{draft?.id ? "Editar promoção" : "Nova promoção"}</DialogTitle><DialogDescription>Para uma oferta de um único dia, use a mesma data no início e no fim.</DialogDescription></DialogHeader>{draft && <form className="budget-form" onSubmit={submit}>
      <label className="field">Título<input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Dia especial da escova" /></label>
      <label className="field">Serviço<select required value={draft.service_id} onChange={(event) => setDraft({ ...draft, service_id: event.target.value })}><option value="">Selecione</option>{services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.name} — {money(service.price)}</option>)}</select></label>
      <div className="field-row"><label className="field">Data inicial<input required type="date" value={draft.start_date} onChange={(event) => setDraft({ ...draft, start_date: event.target.value, end_date: draft.end_date < event.target.value ? event.target.value : draft.end_date })} /></label><label className="field">Data final<input required type="date" min={draft.start_date} value={draft.end_date} onChange={(event) => setDraft({ ...draft, end_date: event.target.value })} /></label></div>
      <label className="field">Preço promocional (R$)<input required type="number" min="0" step="0.01" value={draft.promotional_price} onChange={(event) => setDraft({ ...draft, promotional_price: Number(event.target.value) })} /></label>
      <label className="field">Descrição (opcional)<textarea maxLength={500} value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label className="promotion-active"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Publicar no site das clientes</label>
      <div className="card-actions"><button type="button" className="admin-secondary" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button><button className="admin-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar promoção"}</button></div>
    </form>}</DialogContent></Dialog>
  </>;
}

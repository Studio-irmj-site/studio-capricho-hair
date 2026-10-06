"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AtSign, CalendarDays, Check, ChevronDown, Clock3, LoaderCircle, MapPin, Menu,
  House, MessageCircle, Minus, Plus, Scissors, ShoppingBag, Sparkles, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Monogram, StudioWordmark } from "@/components/monogram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailableSlot, CartItem, DEFAULT_SETTINGS, Service, StudioSettings } from "@/lib/types";
import { dateBR, money, normalizePhone, rpc, supabaseRequest } from "@/lib/supabase";

function whatsappUrl(phone: string, message: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function PublicSite() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [services, setServices] = useState<Service[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<{ protocol: string; total: number } | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "", notes: "", website: "" });
  const startedAt = useRef(0);

  function navigateTab(value: string) {
    setActiveTab(value);
    setMenuOpen(false);
    window.history.replaceState(null, "", `#${value}`);
  }

  useEffect(() => {
    const readHash = () => {
      const value = window.location.hash.slice(1);
      setActiveTab(["inicio", "servicos", "agendamento", "contato"].includes(value) ? value : "inicio");
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();
    Promise.all([
      supabaseRequest<StudioSettings[]>("studio_settings?select=*&limit=1"),
      supabaseRequest<Service[]>("services?select=*&active=eq.true&order=display_order.asc,name.asc"),
      rpc<string[]>("public_available_dates", {}),
    ])
      .then(([studio, serviceRows, dates]) => {
        if (studio[0]) setSettings({ ...DEFAULT_SETTINGS, ...studio[0] });
        setServices(serviceRows);
        setAvailableDates(dates || []);
      })
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.date) return;
    rpc<AvailableSlot[]>("public_available_slots", { p_date: form.date })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [form.date]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addService = (service: Service) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === service.id);
      return existing
        ? current.map((item) => (item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...current, { ...service, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const changeQuantity = (id: string, change: number) => {
    setCart((current) => current
      .map((item) => (item.id === id ? { ...item, quantity: item.quantity + change } : item))
      .filter((item) => item.quantity > 0));
  };

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!cart.length) return toast.error("Selecione pelo menos um serviço.");
    if (!form.date || !form.time) return toast.error("Escolha uma data e um horário disponíveis.");
    if (Date.now() - startedAt.current < 2500 || form.website) return toast.error("Aguarde um instante e tente novamente.");
    setSending(true);
    try {
      const result = await rpc<{ quote_id: string; protocol: string; total: number }>("submit_public_request", {
        p_client_name: form.name,
        p_client_phone: form.phone,
        p_requested_date: form.date,
        p_requested_time: form.time,
        p_notes: form.notes || null,
        p_items: cart.map((item) => ({ service_id: item.id, quantity: item.quantity })),
        p_honeypot: form.website,
      });
      setSuccess({ protocol: result.protocol, total: Number(result.total) });
      const summary = cart.map((item) => `• ${item.name} x${item.quantity}`).join("\n");
      const message = `Olá, ${settings.name}! Enviei uma solicitação pelo site.\n\nProtocolo: ${result.protocol}\nCliente: ${form.name}\nServiços:\n${summary}\nData: ${dateBR(form.date)} às ${form.time.slice(0, 5)}\nTotal estimado: ${money(result.total)}\n\nAguardo a confirmação do horário.`;
      setCart([]);
      setCartOpen(false);
      window.open(whatsappUrl(settings.whatsapp, message), "_blank", "noopener,noreferrer");
      toast.success("Solicitação registrada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar sua solicitação.");
      if (/horário/i.test(String(error))) setForm((old) => ({ ...old, time: "" }));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="public-site" style={{
      "--studio-primary": settings.primary_color || "#101010",
      "--studio-accent": settings.secondary_color || "#c6a25b",
    } as React.CSSProperties}>
      <Toaster richColors position="top-center" />
      <Tabs className="client-portal-tabs" value={activeTab} onValueChange={navigateTab}>
      <header className="public-header">
        <a className="brand" href="#inicio" onClick={(e) => { e.preventDefault(); navigateTab("inicio"); }} aria-label="Ir para o início">
          <StudioWordmark />
          <span className="brand-description"><small>{settings.specialty}</small></span>
        </a>
        <nav className={menuOpen ? "public-nav public-nav-open" : "public-nav"} aria-label="Navegação principal">
          <a href="#inicio" onClick={(e) => { e.preventDefault(); navigateTab("inicio"); }}>Início</a>
          <a href="#servicos" onClick={(e) => { e.preventDefault(); navigateTab("servicos"); }}>Serviços</a>
          <a href="#contato" onClick={(e) => { e.preventDefault(); navigateTab("contato"); }}>Contato</a>
          <a className="nav-whatsapp" href={whatsappUrl(settings.whatsapp, `Olá, ${settings.name}! Gostaria de mais informações.`)} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> Falar no WhatsApp
          </a>
        </nav>
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="Abrir menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="client-navigation">
        <TabsList className="client-tab-list" aria-label="Painel da cliente">
          <TabsTrigger value="inicio"><House /><span>Início</span></TabsTrigger>
          <TabsTrigger value="servicos"><Scissors /><span>Serviços</span></TabsTrigger>
          <TabsTrigger value="agendamento"><CalendarDays /><span>Agendamento</span></TabsTrigger>
          <TabsTrigger value="contato"><MapPin /><span>Contato</span></TabsTrigger>
        </TabsList>
        <button className="client-budget-shortcut" onClick={() => setCartOpen(true)} aria-label={`Ver orçamento com ${count} itens`}><ShoppingBag /><span>Orçamento</span>{count > 0 && <b>{count}</b>}</button>
      </div>

      <main>
        <TabsContent value="inicio" asChild>
        <section id="inicio" className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Cuidado que revela sua melhor versão</span>
            <h1>Seu cabelo, sua essência, <em>nosso capricho.</em></h1>
            <p>{settings.slogan} Atendimento pensado em você, do primeiro cuidado ao resultado final.</p>
            <div className="hero-actions">
              <button className="button button-gold" onClick={() => navigateTab("servicos")}><Scissors size={18} /> Ver serviços</button>
              <button className="button button-outline" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /> Fazer orçamento</button>
            </div>
            <div className="hero-details"><span><MapPin /> {settings.city}</span><span><Clock3 /> {settings.opening_hours}</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="gold-orbit"><Monogram /></div>
            <div className="floating-note"><span>Atendimento personalizado</span><strong>Técnica + cuidado</strong></div>
          </div>
        </section>
        </TabsContent>

        <TabsContent value="servicos" asChild>
        <section id="servicos" className="services-section">
          <div className="section-heading">
            <div><span className="eyebrow">Menu de serviços</span><h2>Escolha seu próximo cuidado</h2></div>
            <p>Selecione os serviços desejados para montar seu orçamento e solicitar um horário disponível.</p>
          </div>
          {loading ? (
            <div className="loading-state"><LoaderCircle className="spin" /><p>Carregando serviços...</p></div>
          ) : services.length ? (
            <div className="service-grid">
              {services.map((service) => (
                <article className="service-card" key={service.id}>
                  <div className="service-icon"><Scissors /></div>
                  <span className="service-category">{service.category}</span>
                  <h3>{service.name}</h3>
                  <p>{service.description || "Cuidado personalizado com atenção a cada detalhe."}</p>
                  <div className="service-footer">
                    <span><strong>{money(service.price)}</strong>{service.unit ? <small> / {service.unit}</small> : null}</span>
                    <button className="round-add" onClick={() => addService(service)} aria-label={`Selecionar ${service.name}`}><Plus /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-public">
              <Scissors />
              <h3>{connected ? "Novidades em breve" : "Estamos preparando nosso catálogo"}</h3>
              <p>{connected ? "Os serviços serão exibidos aqui assim que forem publicados." : "Enquanto isso, fale conosco para consultar serviços e valores."}</p>
              <a className="button button-gold" href={whatsappUrl(settings.whatsapp, `Olá, ${settings.name}! Gostaria de consultar os serviços.`)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Consultar no WhatsApp</a>
            </div>
          )}
        </section>
        </TabsContent>

        <TabsContent value="agendamento" asChild>
        <section className="booking-section">
          <div className="booking-card">
            <div className="booking-icon"><CalendarDays /></div>
            <span className="eyebrow">Agendamento</span>
            <h2>Escolha seus serviços e solicite seu horário.</h2>
            <p>Monte seu orçamento, escolha uma data e um horário disponível e envie a solicitação diretamente para o Studio Capricho Hair pelo WhatsApp.</p>
            <div className="booking-actions">
              <button className="button button-gold" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /> Montar orçamento</button>
              <button className="button button-outline" onClick={() => navigateTab("servicos")}><Scissors size={18} /> Ver serviços</button>
            </div>
            <div className="booking-features">
              <span><Check /> Serviços selecionados</span>
              <span><Check /> Data e horário disponíveis</span>
              <span><Check /> Confirmação pelo WhatsApp</span>
            </div>
          </div>
        </section>
        </TabsContent>

        <TabsContent value="contato" asChild>
        <section id="contato" className="contact-section">
          <div className="contact-copy"><span className="eyebrow">Venha nos conhecer</span><h2>Seu momento de cuidado começa aqui.</h2><p>Atendimento em Jundiaí com horário marcado e toda a atenção que você merece.</p></div>
          <div className="contact-grid">
            <div className="contact-card"><MessageCircle /><span><small>WhatsApp</small><strong>({normalizePhone(settings.whatsapp).slice(2,4)}) {normalizePhone(settings.whatsapp).slice(4,9)}-{normalizePhone(settings.whatsapp).slice(9)}</strong></span></div>
            <a className="contact-card" href={`https://instagram.com/${settings.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"><AtSign /><span><small>Instagram</small><strong>{settings.instagram}</strong></span></a>
            <div className="contact-card"><Clock3 /><span><small>Atendimento</small><strong>{settings.opening_hours}</strong></span></div>
            <a className="contact-card contact-address" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`} target="_blank" rel="noreferrer"><MapPin /><span><small>Endereço</small><strong>{settings.address}</strong></span></a>
          </div>
        </section>
        </TabsContent>
      </main>
      </Tabs>

      <footer><div className="brand footer-brand"><StudioWordmark /><span className="brand-description"><small>{settings.slogan}</small></span></div><p>© {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.</p><a href="/admin">Acesso administrativo</a></footer>

      <button className="floating-cart" onClick={() => setCartOpen(true)} aria-label={`Abrir orçamento com ${count} itens`}>
        <ShoppingBag />{count > 0 && <span>{count}</span>}<strong>{count ? money(total) : "Orçamento"}</strong>
      </button>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild><span /></SheetTrigger>
        <SheetContent className="budget-sheet">
          <SheetHeader><SheetTitle>Seu orçamento</SheetTitle><SheetDescription>Confira os serviços e solicite um horário.</SheetDescription></SheetHeader>
          <div className="budget-body">
            {cart.length ? cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div><strong>{item.name}</strong><small>{money(item.price)} {item.unit ? `/ ${item.unit}` : ""}</small></div>
                <div className="quantity-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Diminuir quantidade"><Minus /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label="Aumentar quantidade"><Plus /></button></div>
                <strong>{money(Number(item.price) * item.quantity)}</strong>
                <button className="remove-button" onClick={() => setCart((c) => c.filter((x) => x.id !== item.id))} aria-label={`Remover ${item.name}`}><Trash2 /></button>
              </div>
            )) : <div className="empty-cart"><ShoppingBag /><h3>Seu orçamento está vazio</h3><p>Selecione um ou mais serviços para continuar.</p><button className="button button-gold" onClick={() => { setCartOpen(false); navigateTab("servicos"); }}>Ver serviços</button></div>}

            {cart.length > 0 && <>
              <div className="budget-total"><span>Valor estimado</span><strong>{money(total)}</strong></div>
              <form className="budget-form" onSubmit={submitRequest}>
                <div className="field"><label htmlFor="client-name">Seu nome</label><input id="client-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" /></div>
                <div className="field"><label htmlFor="client-phone">WhatsApp</label><input id="client-phone" required inputMode="tel" minLength={10} maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                <div className="field-row">
                  <div className="field"><label htmlFor="request-date">Data disponível</label><div className="input-icon"><CalendarDays /><select id="request-date" required value={form.date} onChange={(e) => { setSlots([]); setForm({ ...form, date: e.target.value, time: "" }); }}><option value="">Selecione</option>{availableDates.map((date) => <option key={date} value={date}>{dateBR(date)}</option>)}</select><ChevronDown /></div></div>
                  <div className="field"><label htmlFor="request-time">Horário</label><div className="input-icon"><Clock3 /><select id="request-time" required disabled={!form.date} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}><option value="">Selecione</option>{slots.map((slot) => <option key={slot.availability_id} value={slot.start_time}>{slot.start_time.slice(0,5)}</option>)}</select><ChevronDown /></div></div>
                </div>
                <div className="field"><label htmlFor="client-notes">Observação <span>(opcional)</span></label><textarea id="client-notes" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Conte algo que devemos saber..." /></div>
                <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <button className="button button-gold submit-budget" disabled={sending}>{sending ? <><LoaderCircle className="spin" /> Enviando...</> : <><MessageCircle /> Enviar e abrir WhatsApp</>}</button>
                <p className="form-note">O horário será reservado após a confirmação do estúdio.</p>
              </form>
            </>}
          </div>
        </SheetContent>
      </Sheet>

      {success && <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-card"><div className="success-icon"><Check /></div><span className="eyebrow">Solicitação enviada</span><h2 id="success-title">Pronto, {form.name.split(" ")[0]}!</h2><p>Seu pedido foi registrado. Agora confirme a conversa que abrimos no WhatsApp.</p><div className="protocol"><small>Protocolo</small><strong>{success.protocol}</strong><span>{money(success.total)}</span></div><button className="button button-gold" onClick={() => { setSuccess(null); setForm({ name: "", phone: "", date: "", time: "", notes: "", website: "" }); }}>Concluir</button></div></div>}
    </div>
  );
}

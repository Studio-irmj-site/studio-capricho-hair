"use client";

/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState } from "react";
import {
  Banknote, BarChart3, CalendarCheck, CalendarClock, Check, ChevronRight, CircleDollarSign,
  Clock3, Download, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageCircle,
  Pencil, Plus, ReceiptText, RefreshCw, Scissors, Search, Settings, Trash2, UserRound,
  UsersRound, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Monogram } from "@/components/monogram";
import { downloadFinancialReport, downloadReceipt } from "@/lib/pdf";
import { Appointment, Client, DEFAULT_SETTINGS, Expense, Quote, Service, StudioSettings } from "@/lib/types";
import { dateBR, getStoredSession, money, normalizePhone, rpc, signIn, signOut, supabaseRequest } from "@/lib/supabase";

type Tab = "dashboard" | "services" | "quotes" | "agenda" | "availability" | "clients" | "attendances" | "finance" | "settings";
type Availability = { id: string; available_date: string; start_time: string; active: boolean; blocked: boolean; block_reason?: string | null };
type Attendance = { id: string; appointment_id: string; amount: number; payment_method: string; receipt_number: string; completed_at: string; appointments: Appointment };
type DashboardData = {
  metrics: { revenue: number; completed: number; ticket: number; active_services: number; expenses: number; pending: number; profit: number };
  chart: Array<{ month: string; revenue: number; expenses: number }>;
  upcoming: Appointment[];
  pending_quotes: Quote[];
  top_services: Array<{ service_name: string; quantity: number }>;
  payments: Array<{ payment_method: string; quantity: number; total: number }>;
};

const NAV: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "services", label: "Serviços", icon: Scissors },
  { id: "quotes", label: "Orçamentos", icon: FileText },
  { id: "agenda", label: "Agenda", icon: CalendarCheck },
  { id: "availability", label: "Disponibilidade", icon: CalendarClock },
  { id: "clients", label: "Clientes", icon: UsersRound },
  { id: "attendances", label: "Atendimentos", icon: Check },
  { id: "finance", label: "Financeiro", icon: WalletCards },
  { id: "settings", label: "Configurações", icon: Settings },
];

const emptyDashboard: DashboardData = { metrics: { revenue: 0, completed: 0, ticket: 0, active_services: 0, expenses: 0, pending: 0, profit: 0 }, chart: [], upcoming: [], pending_quotes: [], top_services: [], payments: [] };
const today = new Date().toISOString().slice(0, 10);

function statusClass(status: string) { return `status-badge status-${status.toLowerCase().replace(/ã/g,"a").replace(/í/g,"i").replace(/\s/g,"-")}`; }
function whatsappClient(phone: string, message: string) { return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`; }

export function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [services, setServices] = useState<Service[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string; label: string } | null>(null);
  const [serviceDialog, setServiceDialog] = useState<Service | Partial<Service> | null>(null);
  const [availabilityDialog, setAvailabilityDialog] = useState<Availability | Partial<Availability> | null>(null);
  const [bulkAvailabilityDialog, setBulkAvailabilityDialog] = useState(false);
  const [clientDialog, setClientDialog] = useState<Client | Partial<Client> | null>(null);
  const [expenseDialog, setExpenseDialog] = useState<Expense | Partial<Expense> | null>(null);
  const [appointmentDialog, setAppointmentDialog] = useState<Appointment | Partial<Appointment> | null>(null);
  const [completion, setCompletion] = useState<{ appointment: Appointment; payment: string } | null>(null);
  const [history, setHistory] = useState<{ client: Client; appointments: Appointment[] } | null>(null);

  const loadSettings = useCallback(async () => {
    const rows = await supabaseRequest<StudioSettings[]>("studio_settings?select=*&limit=1", {}, true);
    if (rows[0]) setStudio({ ...DEFAULT_SETTINGS, ...rows[0] });
  }, []);

  const loadTab = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") setDashboard((await rpc<DashboardData>("admin_dashboard", {}, true)) || emptyDashboard);
      if (activeTab === "services") setServices(await supabaseRequest<Service[]>("services?select=*&order=display_order.asc,name.asc", {}, true));
      if (activeTab === "quotes") setQuotes(await supabaseRequest<Quote[]>("quotes?select=*,quote_items(*)&order=created_at.desc", {}, true));
      if (activeTab === "agenda") setAppointments(await supabaseRequest<Appointment[]>("appointments?select=*&order=scheduled_date.desc,scheduled_time.asc", {}, true));
      if (activeTab === "availability") setAvailability(await supabaseRequest<Availability[]>("availability?select=*&order=available_date.desc,start_time.asc", {}, true));
      if (activeTab === "clients") setClients(await supabaseRequest<Client[]>("clients?select=*&order=name.asc", {}, true));
      if (activeTab === "attendances") setAttendances(await supabaseRequest<Attendance[]>("attendances?select=*,appointments(*)&order=completed_at.desc", {}, true));
      if (activeTab === "finance") {
        const [attendanceRows, expenseRows] = await Promise.all([
          supabaseRequest<Attendance[]>("attendances?select=*,appointments(*)&order=completed_at.desc", {}, true),
          supabaseRequest<Expense[]>("expenses?select=*&order=expense_date.desc", {}, true),
        ]);
        setAttendances(attendanceRows); setExpenses(expenseRows);
      }
      if (activeTab === "settings") await loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar os dados.";
      toast.error(message);
      if (/sessão|jwt|autorizado/i.test(message)) setAuthenticated(false);
    } finally { setLoading(false); }
  }, [loadSettings]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session?.user?.id) { Promise.resolve().then(() => setChecking(false)); return; }
    supabaseRequest(`administrators?select=user_id&user_id=eq.${session.user.id}&active=eq.true`, {}, true)
      .then((rows) => setAuthenticated(Array.isArray(rows) && rows.length > 0))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => { if (authenticated) { Promise.resolve().then(() => loadTab(tab)); if (tab !== "settings") Promise.resolve().then(() => loadSettings().catch(() => undefined)); } }, [authenticated, tab, loadTab, loadSettings]);

  async function addFullDayAvailability(value: { available_date: string; start_time: string; end_time: string; interval: number }) {
    const [sh, sm] = value.start_time.split(":").map(Number); const [eh, em] = value.end_time.split(":").map(Number);
    const startMinutes = sh * 60 + sm; const endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) throw new Error("O horário final deve ser maior que o inicial.");
    const existingTimes = new Set(availability.filter((row) => row.available_date === value.available_date).map((row) => String(row.start_time).slice(0, 5)));
    const rows: Record<string, unknown>[] = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += value.interval) { const time = String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0"); if (!existingTimes.has(time)) rows.push({ available_date: value.available_date, start_time: time, active: true, blocked: false, block_reason: null }); }
    if (!rows.length) { toast.info("Todos os horários desse período já estão cadastrados."); setBulkAvailabilityDialog(false); return; }
    await supabaseRequest("availability", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) }, true);
    toast.success(rows.length + " horários liberados com sucesso."); setBulkAvailabilityDialog(false); await loadTab("availability");
  }

  async function logout() { await signOut(); setAuthenticated(false); toast.success("Sessão encerrada."); }
  function navigate(next: Tab) { setTab(next); setMobileMenu(false); setSearch(""); }

  async function saveRecord(table: string, value: Record<string, unknown>, id?: string) {
    const path = id ? `${table}?id=eq.${id}` : table;
    await supabaseRequest(path, { method: id ? "PATCH" : "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(value) }, true);
    toast.success(id ? "Alterações salvas." : "Cadastro realizado.");
    await loadTab(tab);
  }

  async function removeRecord() {
    if (!deleteTarget) return;
    try {
      await supabaseRequest(`${deleteTarget.table}?id=eq.${deleteTarget.id}`, { method: "DELETE" }, true);
      toast.success(`${deleteTarget.label} excluído.`); setDeleteTarget(null); await loadTab(tab);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir."); }
  }

  async function toggleService(service: Service, active: boolean) {
    try { await saveRecord("services", { active }, service.id); } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao atualizar."); }
  }

  async function updateQuote(quote: Quote, action: "confirm" | "refuse") {
    try {
      if (action === "confirm") await rpc("confirm_quote", { p_quote_id: quote.id }, true);
      else await supabaseRequest(`quotes?id=eq.${quote.id}&status=eq.Pendente`, { method: "PATCH", body: JSON.stringify({ status: "Recusado" }) }, true);
      toast.success(action === "confirm" ? "Solicitação confirmada e adicionada à agenda." : "Solicitação recusada.");
      await loadTab("quotes");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."); }
  }

  async function changeAppointmentStatus(appointment: Appointment, status: string) {
    if (status === "Concluído") { setCompletion({ appointment, payment: "Pix" }); return; }
    try {
      await rpc("set_appointment_status", { p_appointment_id: appointment.id, p_status: status }, true);
      toast.success("Status atualizado."); await loadTab("agenda");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."); }
  }

  async function finishAppointment() {
    if (!completion) return;
    try {
      const result = await rpc<{ receipt_number: string }>("complete_appointment", { p_appointment_id: completion.appointment.id, p_payment_method: completion.payment }, true);
      const completed = { ...completion.appointment, status: "Concluído" as const, payment_method: completion.payment, receipt_number: result.receipt_number };
      setCompletion(null); toast.success("Atendimento concluído. Anexe o PDF baixado no WhatsApp."); downloadReceipt(completed, studio);
      window.open(whatsappClient(completed.client_phone, `Olá, ${completed.client_name}! Seu recibo do ${studio.name} está pronto. Para enviar, anexe o PDF que acabou de ser baixado.`), "_blank", "noopener,noreferrer");
      await loadTab(tab);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir."); }
  }

  async function openHistory(client: Client) {
    try {
      const rows = await supabaseRequest<Appointment[]>(`appointments?select=*&client_id=eq.${client.id}&order=scheduled_date.desc`, {}, true);
      setHistory({ client, appointments: rows });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível carregar o histórico."); }
  }

  if (checking) return <div className="admin-loading"><LoaderCircle className="spin" /><p>Verificando acesso...</p></div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  const activeLabel = NAV.find((item) => item.id === tab)?.label || "Painel";
  return (
    <div className="admin-app">
      <Toaster richColors position="top-right" />
      <aside className="admin-sidebar"><SidebarContent active={tab} navigate={navigate} logout={logout} studio={studio} /></aside>
      <Sheet open={mobileMenu} onOpenChange={setMobileMenu}><SheetContent side="left" className="mobile-sidebar"><SheetHeader className="sr-only"><SheetTitle>Menu</SheetTitle><SheetDescription>Navegação do painel</SheetDescription></SheetHeader><SidebarContent active={tab} navigate={navigate} logout={logout} studio={studio} /></SheetContent></Sheet>
      <main className="admin-main">
        <header className="admin-topbar">
          <div><button className="admin-mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu /></button><span><small>Painel administrativo</small><strong>{activeLabel}</strong></span></div>
          <div className="topbar-actions"><button className="refresh-button" onClick={() => loadTab(tab)} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> Atualizar</button><a className="view-site" href="/" target="_blank">Ver página da cliente <ChevronRight /></a></div>
        </header>
        <div className="admin-content">
          {loading && <div className="content-loading"><LoaderCircle className="spin" /> Atualizando dados...</div>}
          {tab === "dashboard" && <Dashboard data={dashboard} navigate={navigate} />}
          {tab === "services" && <Services rows={services} search={search} setSearch={setSearch} onNew={() => setServiceDialog({ active: true, display_order: 0 })} onEdit={setServiceDialog} onDelete={(row) => setDeleteTarget({ table: "services", id: row.id, label: "Serviço" })} onToggle={toggleService} />}
          {tab === "quotes" && <Quotes rows={quotes} search={search} setSearch={setSearch} onAction={updateQuote} />}
          {tab === "agenda" && <Agenda rows={appointments} search={search} setSearch={setSearch} onNew={() => setAppointmentDialog({ status: "Agendado", scheduled_date: today, scheduled_time: "09:00", total: 0 })} onEdit={setAppointmentDialog} onStatus={changeAppointmentStatus} onReceipt={(row) => downloadReceipt(row, studio)} />}
          {tab === "availability" && <AvailabilityPanel rows={availability} onNew={() => setAvailabilityDialog({ available_date: today, start_time: "09:00", active: true, blocked: false })} onBulk={() => setBulkAvailabilityDialog(true)} onEdit={setAvailabilityDialog} onDelete={(row) => setDeleteTarget({ table: "availability", id: row.id, label: "Horário" })} onToggle={(row, active) => saveRecord("availability", { active }, row.id).catch((e) => toast.error(e.message))} />}
          {tab === "clients" && <Clients rows={clients} search={search} setSearch={setSearch} onNew={() => setClientDialog({})} onEdit={setClientDialog} onDelete={(row) => setDeleteTarget({ table: "clients", id: row.id, label: "Cliente" })} onHistory={openHistory} />}
          {tab === "attendances" && <Attendances rows={attendances} studio={studio} />}
          {tab === "finance" && <Finance attendances={attendances} expenses={expenses} studio={studio} onNewExpense={() => setExpenseDialog({ expense_date: today, payment_method: "Pix" })} onEditExpense={setExpenseDialog} onDeleteExpense={(row) => setDeleteTarget({ table: "expenses", id: row.id, label: "Despesa" })} />}
          {tab === "settings" && <SettingsPanel value={studio} setValue={setStudio} save={() => saveRecord("studio_settings", studio as unknown as Record<string, unknown>, studio.id)} />}
        </div>
      </main>

      <ServiceForm key={serviceDialog?.id || (serviceDialog ? "service-new" : "service-closed")} value={serviceDialog} close={() => setServiceDialog(null)} save={async (value) => { await saveRecord("services", value, serviceDialog?.id); setServiceDialog(null); }} />
      <AvailabilityForm key={availabilityDialog?.id || (availabilityDialog ? "slot-new" : "slot-closed")} value={availabilityDialog} close={() => setAvailabilityDialog(null)} save={async (value) => { await saveRecord("availability", value, availabilityDialog?.id); setAvailabilityDialog(null); }} />
      <BulkAvailabilityForm open={bulkAvailabilityDialog} close={() => setBulkAvailabilityDialog(false)} save={addFullDayAvailability} />
      <ClientForm key={clientDialog?.id || (clientDialog ? "client-new" : "client-closed")} value={clientDialog} close={() => setClientDialog(null)} save={async (value) => { await saveRecord("clients", { ...value, phone: normalizePhone(String(value.phone || "")) }, clientDialog?.id); setClientDialog(null); }} />
      <ExpenseForm key={expenseDialog?.id || (expenseDialog ? "expense-new" : "expense-closed")} value={expenseDialog} close={() => setExpenseDialog(null)} save={async (value) => { await saveRecord("expenses", value, expenseDialog?.id); setExpenseDialog(null); }} />
      <AppointmentForm key={appointmentDialog?.id || (appointmentDialog ? "appointment-new" : "appointment-closed")} value={appointmentDialog} close={() => setAppointmentDialog(null)} save={async (value) => {
        await rpc("admin_save_appointment", {
          p_id: appointmentDialog?.id || null,
          p_client_name: value.client_name,
          p_client_phone: normalizePhone(String(value.client_phone || "")),
          p_service_summary: value.service_summary,
          p_scheduled_date: value.scheduled_date,
          p_scheduled_time: value.scheduled_time,
          p_total: value.total,
          p_notes: value.notes,
          p_status: value.status,
        }, true);
        toast.success(appointmentDialog?.id ? "Agendamento atualizado." : "Agendamento criado.");
        setAppointmentDialog(null);
        await loadTab("agenda");
      }} />
      <CompletionDialog value={completion} setValue={setCompletion} confirm={finishAppointment} />
      <HistoryDialog value={history} close={() => setHistory(null)} />
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle><AlertDialogDescription>Esta ação removerá o registro selecionado. Verifique se ele não possui vínculos importantes.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeRecord}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); try { const session = await signIn(email, password); const rows = await supabaseRequest<unknown[]>(`administrators?select=user_id&user_id=eq.${session.user?.id}&active=eq.true`, {}, true); if (!rows.length) { await signOut(); throw new Error("Este usuário não possui autorização administrativa."); } toast.success("Acesso liberado."); onSuccess(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível entrar."); } finally { setLoading(false); } }
  return <div className="login-page"><Toaster richColors position="top-center" /><section className="login-brand"><div className="login-orbit"><Monogram /></div><div><span className="eyebrow">Gestão inteligente para beleza</span><h1>Organização que deixa seu talento brilhar.</h1><p>Agenda, clientes, serviços, financeiro e recibos reunidos em um painel simples e seguro.</p></div></section><section className="login-panel"><a href="/" className="back-site">← Voltar ao site</a><form onSubmit={submit} className="login-form"><Monogram compact /><span className="eyebrow">Área restrita</span><h2>Bem-vinda ao painel</h2><p>Entre com seu e-mail e senha de administradora.</p><div className="field"><label htmlFor="admin-email">E-mail</label><input id="admin-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></div><div className="field"><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></div><button className="button button-gold login-button" disabled={loading}>{loading ? <><LoaderCircle className="spin" /> Entrando...</> : "Entrar no painel"}</button><small>Acesso exclusivo para administradores autorizados.</small></form></section></div>;
}

function SidebarContent({ active, navigate, logout, studio }: { active: Tab; navigate: (tab: Tab) => void; logout: () => void; studio: StudioSettings }) {
  return <div className="sidebar-content"><div className="sidebar-brand"><Monogram compact /><span><strong>{studio.name}</strong><small>Painel administrativo</small></span></div><nav aria-label="Menu administrativo">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? "active" : ""} onClick={() => navigate(id)}><Icon /><span>{label}</span>{id === "quotes" && <i />}</button>)}</nav><div className="sidebar-footer"><span><UserRound /><small>Administradora</small></span><button onClick={logout}><LogOut /> Sair</button></div></div>;
}

function PageTitle({ eyebrow, title, description, action, children }: { eyebrow: string; title: string; description: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return <div className="admin-page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="page-title-actions">{children}{action}</div></div>;
}

function SearchBox({ value, setValue, placeholder = "Pesquisar..." }: { value: string; setValue: (v: string) => void; placeholder?: string }) { return <div className="search-box"><Search /><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} />{value && <button onClick={() => setValue("")}><X /></button>}</div>; }
function Empty({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="admin-empty"><Icon /><h3>{title}</h3><p>{text}</p></div>; }

function Dashboard({ data, navigate }: { data: DashboardData; navigate: (tab: Tab) => void }) {
  const max = Math.max(1, ...data.chart.flatMap((row) => [Number(row.revenue), Number(row.expenses)]));
  const metrics = [
    { label: "Faturamento do mês", value: money(data.metrics.revenue), icon: CircleDollarSign, tone: "gold" },
    { label: "Atendimentos concluídos", value: String(data.metrics.completed), icon: Check, tone: "green" },
    { label: "Ticket médio", value: money(data.metrics.ticket), icon: ReceiptText, tone: "blue" },
    { label: "Lucro estimado", value: money(data.metrics.profit), icon: BarChart3, tone: data.metrics.profit >= 0 ? "green" : "red" },
    { label: "Despesas do mês", value: money(data.metrics.expenses), icon: Banknote, tone: "red" },
    { label: "Serviços ativos", value: String(data.metrics.active_services), icon: Scissors, tone: "purple" },
  ];
  return <><PageTitle eyebrow="Visão geral" title="Seu estúdio em números" description="Resultados atualizados somente com atendimentos concluídos." />
    <div className="metric-grid">{metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className={`metric-card tone-${tone}`}><div><span>{label}</span><strong>{value}</strong></div><i><Icon /></i></article>)}</div>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span>Últimos seis meses</span><h2>Faturamento e despesas</h2></div><div className="chart-legend"><span><i className="revenue-dot" />Faturamento</span><span><i className="expense-dot" />Despesas</span></div></div><div className="bar-chart">{data.chart.length ? data.chart.map((row) => <div className="chart-column" key={row.month}><div className="bars"><i className="bar-revenue" style={{ height: `${Math.max(3, Number(row.revenue) / max * 100)}%` }} title={money(row.revenue)} /><i className="bar-expense" style={{ height: `${Math.max(3, Number(row.expenses) / max * 100)}%` }} title={money(row.expenses)} /></div><span>{row.month}</span></div>) : <Empty icon={BarChart3} title="Sem dados financeiros" text="O gráfico será preenchido após as primeiras movimentações." />}</div></section>
      <section className="panel"><div className="panel-heading"><div><span>Fila de entrada</span><h2>Solicitações pendentes</h2></div><button onClick={() => navigate("quotes")}>Ver todas <ChevronRight /></button></div>{data.pending_quotes.length ? <div className="compact-list">{data.pending_quotes.map((row) => <div key={row.id}><i>{row.client_name.slice(0,2).toUpperCase()}</i><span><strong>{row.client_name}</strong><small>{dateBR(row.requested_date)} • {String(row.requested_time).slice(0,5)}</small></span><b>{money(row.total)}</b></div>)}</div> : <Empty icon={FileText} title="Tudo em dia" text="Nenhuma solicitação pendente." />}</section>
      <section className="panel"><div className="panel-heading"><div><span>Agenda</span><h2>Próximos horários</h2></div><button onClick={() => navigate("agenda")}>Ver agenda <ChevronRight /></button></div>{data.upcoming.length ? <div className="compact-list">{data.upcoming.map((row) => <div key={row.id}><i><CalendarCheck /></i><span><strong>{row.client_name}</strong><small>{dateBR(row.scheduled_date)} • {String(row.scheduled_time).slice(0,5)}</small></span><b className={statusClass(row.status)}>{row.status}</b></div>)}</div> : <Empty icon={CalendarCheck} title="Agenda livre" text="Nenhum próximo agendamento." />}</section>
      <section className="panel split-stats"><div><div className="panel-heading"><div><span>Preferências</span><h2>Serviços mais realizados</h2></div></div>{data.top_services.length ? data.top_services.map((row, index) => <div className="rank-row" key={row.service_name}><i>{index+1}</i><span>{row.service_name}</span><strong>{row.quantity}</strong></div>) : <p className="muted">Aguardando atendimentos.</p>}</div><div><div className="panel-heading"><div><span>Recebimentos</span><h2>Formas de pagamento</h2></div></div>{data.payments.length ? data.payments.map((row) => <div className="rank-row" key={row.payment_method}><i><WalletCards /></i><span>{row.payment_method}</span><strong>{row.quantity}</strong></div>) : <p className="muted">Aguardando recebimentos.</p>}</div></section>
    </div></>;
}

function Services({ rows, search, setSearch, onNew, onEdit, onDelete, onToggle }: { rows: Service[]; search: string; setSearch: (v:string)=>void; onNew:()=>void; onEdit:(r:Service)=>void; onDelete:(r:Service)=>void; onToggle:(r:Service,v:boolean)=>void }) {
  const filtered = rows.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Catálogo" title="Serviços" description="Os preços exibidos às clientes vêm diretamente deste cadastro." action={<button className="admin-primary" onClick={onNew}><Plus /> Novo serviço</button>}><SearchBox value={search} setValue={setSearch} placeholder="Pesquisar serviço" /></PageTitle>{filtered.length ? <div className="admin-card-grid">{filtered.map((row) => <article className="admin-service-card" key={row.id}><div className="card-top"><i><Scissors /></i><Switch checked={row.active} onCheckedChange={(v) => onToggle(row,v)} aria-label={`${row.active ? "Desativar" : "Ativar"} ${row.name}`} /></div><span>{row.category}</span><h3>{row.name}</h3><p>{row.description || "Sem descrição cadastrada."}</p><div className="card-price"><strong>{money(row.price)}</strong><small>{row.unit || "preço fixo"}</small></div><div className="card-actions"><button onClick={() => onEdit(row)}><Pencil /> Editar</button><button className="danger" onClick={() => onDelete(row)}><Trash2 /> Excluir</button></div></article>)}</div> : <Empty icon={Scissors} title="Nenhum serviço encontrado" text="Cadastre ou ajuste sua busca para começar." />}</>;
}

function Quotes({ rows, search, setSearch, onAction }: { rows: Quote[]; search:string; setSearch:(v:string)=>void; onAction:(r:Quote,a:"confirm"|"refuse")=>void }) {
  const filtered = rows.filter((r) => `${r.client_name} ${r.client_phone} ${r.protocol}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Entrada automática" title="Orçamentos e solicitações" description="Pedidos enviados pela página da cliente aparecem aqui em tempo real."><SearchBox value={search} setValue={setSearch} placeholder="Nome, telefone ou protocolo" /></PageTitle>{filtered.length ? <div className="request-list">{filtered.map((row) => <article className="request-card" key={row.id}><div className="request-head"><div><i>{row.client_name.slice(0,2).toUpperCase()}</i><span><strong>{row.client_name}</strong><small>{row.protocol} • enviado em {new Date(row.created_at).toLocaleString("pt-BR")}</small></span></div><b className={statusClass(row.status)}>{row.status}</b></div><div className="request-info"><span><small>Serviços</small><strong>{row.quote_items?.map((i) => `${i.service_name} x${i.quantity}`).join(", ") || "—"}</strong></span><span><small>Data solicitada</small><strong>{dateBR(row.requested_date)} às {String(row.requested_time).slice(0,5)}</strong></span><span><small>WhatsApp</small><strong>{row.client_phone}</strong></span><span><small>Valor total</small><strong>{money(row.total)}</strong></span></div>{row.notes && <p className="request-note">“{row.notes}”</p>}<div className="request-actions"><a href={whatsappClient(row.client_phone, `Olá, ${row.client_name}! Recebemos sua solicitação no Studio Capricho Hair.`)} target="_blank"><MessageCircle /> Abrir WhatsApp</a>{row.status === "Pendente" && <><button className="confirm" onClick={() => onAction(row,"confirm")}><Check /> Confirmar e agendar</button><button className="danger" onClick={() => onAction(row,"refuse")}><X /> Recusar</button></>}</div></article>)}</div> : <Empty icon={FileText} title="Nenhuma solicitação" text="Os pedidos da página pública aparecerão aqui." />}</>;
}

function Agenda({ rows, search, setSearch, onNew, onEdit, onStatus, onReceipt }: { rows:Appointment[]; search:string; setSearch:(v:string)=>void; onNew:()=>void; onEdit:(r:Appointment)=>void; onStatus:(r:Appointment,s:string)=>void; onReceipt:(r:Appointment)=>void }) {
  const filtered = rows.filter((r) => `${r.client_name} ${r.service_summary} ${r.scheduled_date} ${dateBR(r.scheduled_date)}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Organização diária" title="Agenda" description="Somente atendimentos concluídos entram no faturamento." action={<button className="admin-primary" onClick={onNew}><Plus /> Novo agendamento</button>}><SearchBox value={search} setValue={setSearch} placeholder="Pesquisar cliente ou serviço" /></PageTitle>{filtered.length ? <div className="table-shell"><table><thead><tr><th>Cliente</th><th>Serviço</th><th>Data e horário</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.client_name}</strong><small>{row.client_phone}</small></td><td><strong>{row.service_summary}</strong><small>{row.notes || "Sem observações"}</small></td><td><strong>{dateBR(row.scheduled_date)}</strong><small>{String(row.scheduled_time).slice(0,5)}</small></td><td><strong>{money(row.total)}</strong></td><td><select className={statusClass(row.status)} value={row.status} onChange={(e) => onStatus(row,e.target.value)}><option>Agendado</option><option>Confirmado</option><option>Concluído</option><option>Cancelado</option></select></td><td><div className="row-actions"><a href={whatsappClient(row.client_phone, `Olá, ${row.client_name}! Estou entrando em contato sobre seu horário no Studio Capricho Hair.`)} target="_blank" title="WhatsApp"><MessageCircle /></a>{row.status === "Concluído" ? <button onClick={() => onReceipt(row)} title="Baixar recibo"><ReceiptText /></button> : <button onClick={() => onEdit(row)} title="Editar"><Pencil /></button>}</div></td></tr>)}</tbody></table></div> : <Empty icon={CalendarCheck} title="Agenda vazia" text="Crie um agendamento ou confirme uma solicitação." />}</>;
}

function AvailabilityPanel({ rows, onNew, onBulk, onEdit, onDelete, onToggle }: { rows:Availability[]; onNew:()=>void; onBulk:()=>void; onEdit:(r:Availability)=>void; onDelete:(r:Availability)=>void; onToggle:(r:Availability,v:boolean)=>void }) {
  return <><PageTitle eyebrow="Horários públicos" title="Disponibilidade" description="A cliente vê apenas horários ativos, desbloqueados e ainda não ocupados." action={<><button className="admin-secondary" onClick={onBulk}>Liberar dia completo</button><button className="admin-primary" onClick={onNew}><Plus /> Adicionar horário</button></>} />{rows.length ? <div className="availability-grid">{rows.map((row) => <article key={row.id} className={row.blocked ? "slot-card blocked" : "slot-card"}><div><CalendarClock /><span><strong>{dateBR(row.available_date)}</strong><small>{String(row.start_time).slice(0,5)} {row.blocked ? `• ${row.block_reason || "Bloqueado"}` : ""}</small></span></div><Switch checked={row.active} onCheckedChange={(v) => onToggle(row,v)} /><div><button onClick={() => onEdit(row)}><Pencil /> Editar</button><button className="danger" onClick={() => onDelete(row)}><Trash2 /></button></div></article>)}</div> : <Empty icon={CalendarClock} title="Sem horários cadastrados" text="Adicione as datas e horários que ficarão disponíveis para as clientes." />}</>;
}

function Clients({ rows, search, setSearch, onNew, onEdit, onDelete, onHistory }: { rows:Client[]; search:string; setSearch:(v:string)=>void; onNew:()=>void; onEdit:(r:Client)=>void; onDelete:(r:Client)=>void; onHistory:(r:Client)=>void }) {
  const filtered=rows.filter((r)=>`${r.name} ${r.phone}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageTitle eyebrow="Relacionamento" title="Clientes" description="Cadastros e histórico centralizados para um atendimento personalizado." action={<button className="admin-primary" onClick={onNew}><Plus /> Nova cliente</button>}><SearchBox value={search} setValue={setSearch} placeholder="Pesquisar nome ou telefone" /></PageTitle>{filtered.length ? <div className="table-shell"><table><thead><tr><th>Cliente</th><th>WhatsApp</th><th>Nascimento</th><th>Observações</th><th>Ações</th></tr></thead><tbody>{filtered.map((row)=><tr key={row.id}><td><strong>{row.name}</strong></td><td><strong>{row.phone}</strong></td><td>{row.birth_date?dateBR(row.birth_date):"—"}</td><td className="table-note">{row.notes||"—"}</td><td><div className="row-actions"><button onClick={()=>onHistory(row)} title="Histórico"><Clock3 /></button><a href={whatsappClient(row.phone,`Olá, ${row.name}! Tudo bem?`)} target="_blank"><MessageCircle /></a><button onClick={()=>onEdit(row)}><Pencil /></button><button className="danger" onClick={()=>onDelete(row)}><Trash2 /></button></div></td></tr>)}</tbody></table></div>:<Empty icon={UsersRound} title="Nenhuma cliente cadastrada" text="Os novos pedidos também criam o cadastro automaticamente." />}</>;
}

function Attendances({ rows, studio }: { rows:Attendance[]; studio:StudioSettings }) {
  return <><PageTitle eyebrow="Serviços finalizados" title="Atendimentos" description="Cada agendamento concluído gera um único atendimento e um recibo permanente." />{rows.length ? <div className="table-shell"><table><thead><tr><th>Recibo</th><th>Cliente e serviço</th><th>Conclusão</th><th>Pagamento</th><th>Valor</th><th>Recibo</th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td><strong>{row.receipt_number}</strong></td><td><strong>{row.appointments?.client_name}</strong><small>{row.appointments?.service_summary}</small></td><td>{new Date(row.completed_at).toLocaleString("pt-BR")}</td><td>{row.payment_method}</td><td><strong>{money(row.amount)}</strong></td><td><div className="row-actions"><button onClick={()=>downloadReceipt({ ...row.appointments, payment_method:row.payment_method, receipt_number:row.receipt_number },studio)}><Download /></button><a href={whatsappClient(row.appointments.client_phone,`Olá, ${row.appointments.client_name}! Seu recibo do ${studio.name} está pronto. Anexe o PDF baixado nesta conversa.`)} target="_blank"><MessageCircle /></a></div></td></tr>)}</tbody></table></div>:<Empty icon={Check} title="Nenhum atendimento concluído" text="Ao concluir um serviço, o registro aparecerá aqui." />}</>;
}

function Finance({ attendances, expenses, studio, onNewExpense, onEditExpense, onDeleteExpense }: { attendances:Attendance[]; expenses:Expense[]; studio:StudioSettings; onNewExpense:()=>void; onEditExpense:(r:Expense)=>void; onDeleteExpense:(r:Expense)=>void }) {
  const [from,setFrom]=useState(new Date(new Date().setDate(1)).toISOString().slice(0,10)); const [to,setTo]=useState(today); const [payment,setPayment]=useState("Todas");
  const income=attendances.filter((r)=>r.completed_at.slice(0,10)>=from&&r.completed_at.slice(0,10)<=to&&(payment==="Todas"||r.payment_method===payment));
  const cost=expenses.filter((r)=>r.expense_date>=from&&r.expense_date<=to); const revenue=income.reduce((s,r)=>s+Number(r.amount),0); const totalCosts=cost.reduce((s,r)=>s+Number(r.amount),0);
  return <><PageTitle eyebrow="Controle de caixa" title="Financeiro" description="O faturamento considera exclusivamente atendimentos concluídos." action={<button className="admin-primary" onClick={onNewExpense}><Plus /> Nova despesa</button>}><button className="admin-secondary" onClick={()=>downloadFinancialReport(studio,`${dateBR(from)} a ${dateBR(to)}`,revenue,totalCosts,income.map((r)=>({label:r.appointments.client_name,value:`${r.payment_method} - ${money(r.amount)}`})))}><FileText /> Exportar PDF</button></PageTitle><div className="filter-bar"><div className="field"><label>De</label><input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></div><div className="field"><label>Até</label><input type="date" value={to} onChange={(e)=>setTo(e.target.value)} /></div><div className="field"><label>Pagamento</label><select value={payment} onChange={(e)=>setPayment(e.target.value)}><option>Todas</option><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option><option>Outro</option></select></div></div><div className="finance-summary"><article><span>Faturamento</span><strong>{money(revenue)}</strong><CircleDollarSign /></article><article><span>Despesas</span><strong>{money(totalCosts)}</strong><Banknote /></article><article className={revenue-totalCosts>=0?"profit":"loss"}><span>Lucro estimado</span><strong>{money(revenue-totalCosts)}</strong><BarChart3 /></article><article><span>Ticket médio</span><strong>{money(income.length?revenue/income.length:0)}</strong><ReceiptText /></article></div><section className="panel finance-panel"><div className="panel-heading"><div><span>Saídas</span><h2>Despesas do período</h2></div></div>{cost.length?<div className="table-shell flat"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Pagamento</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{cost.map((row)=><tr key={row.id}><td><strong>{row.description}</strong><small>{row.notes||""}</small></td><td>{row.category}</td><td>{dateBR(row.expense_date)}</td><td>{row.payment_method}</td><td><strong>{money(row.amount)}</strong></td><td><div className="row-actions"><button onClick={()=>onEditExpense(row)}><Pencil /></button><button className="danger" onClick={()=>onDeleteExpense(row)}><Trash2 /></button></div></td></tr>)}</tbody></table></div>:<Empty icon={Banknote} title="Sem despesas no período" text="Cadastre suas saídas para acompanhar o lucro real." />}</section></>;
}

function SettingsPanel({ value, setValue, save }: { value:StudioSettings; setValue:(v:StudioSettings)=>void; save:()=>void }) {
  return <><PageTitle eyebrow="Personalização" title="Configurações do estúdio" description="As alterações refletem na página pública e nos próximos recibos." action={<button className="admin-primary" onClick={save}><Check /> Salvar alterações</button>} /><div className="settings-layout"><section className="panel settings-form"><h2>Identidade e contato</h2><div className="settings-grid"><Field label="Nome do estúdio"><input value={value.name} onChange={(e)=>setValue({...value,name:e.target.value})} /></Field><Field label="Especialidade"><input value={value.specialty} onChange={(e)=>setValue({...value,specialty:e.target.value})} /></Field><Field label="Slogan" wide><input value={value.slogan} onChange={(e)=>setValue({...value,slogan:e.target.value})} /></Field><Field label="WhatsApp"><input value={value.whatsapp} onChange={(e)=>setValue({...value,whatsapp:e.target.value})} /></Field><Field label="Instagram"><input value={value.instagram} onChange={(e)=>setValue({...value,instagram:e.target.value})} /></Field><Field label="Cidade"><input value={value.city} onChange={(e)=>setValue({...value,city:e.target.value})} /></Field><Field label="Horário de funcionamento"><input value={value.opening_hours} onChange={(e)=>setValue({...value,opening_hours:e.target.value})} /></Field><Field label="Endereço completo" wide><textarea value={value.address} onChange={(e)=>setValue({...value,address:e.target.value})} /></Field><Field label="Mensagem de agradecimento do recibo" wide><textarea value={value.thank_you_message||""} onChange={(e)=>setValue({...value,thank_you_message:e.target.value})} /></Field><Field label="Cor principal"><input type="color" value={value.primary_color||"#101010"} onChange={(e)=>setValue({...value,primary_color:e.target.value})} /></Field><Field label="Cor secundária"><input type="color" value={value.secondary_color||"#c6a25b"} onChange={(e)=>setValue({...value,secondary_color:e.target.value})} /></Field></div></section><aside className="settings-preview"><span>Prévia da identidade</span><div style={{background:value.primary_color,color:"white"}}><Monogram /><h3>{value.name}</h3><p>{value.slogan}</p><i style={{background:value.secondary_color}}>Solicitar horário</i></div></aside></div></>;
}

function Field({ label, wide=false, children }: { label:string; wide?:boolean; children:React.ReactNode }) { return <label className={wide?"settings-field wide":"settings-field"}><span>{label}</span>{children}</label>; }

function FormDialog({ open, title, description, close, submit, children }: { open:boolean; title:string; description:string; close:()=>void; submit:(e:React.FormEvent)=>void|Promise<void>; children:React.ReactNode }) { const [submitting,setSubmitting]=useState(false); async function handleSubmit(event:React.FormEvent){ event.preventDefault(); setSubmitting(true); try { await submit(event); } catch(error) { toast.error(error instanceof Error?error.message:"Não foi possível salvar."); } finally { setSubmitting(false); } } return <Dialog open={open} onOpenChange={(v)=>!v&&!submitting&&close()}><DialogContent className="admin-dialog"><form onSubmit={handleSubmit}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="dialog-fields">{children}</div><DialogFooter><button type="button" className="admin-secondary" onClick={close} disabled={submitting}>Cancelar</button><button className="admin-primary" disabled={submitting}>{submitting?<><LoaderCircle className="spin" /> Salvando...</>:"Salvar"}</button></DialogFooter></form></DialogContent></Dialog>; }

function ServiceForm({ value, close, save }: { value:Service|Partial<Service>|null; close:()=>void; save:(v:Record<string,unknown>)=>Promise<void> }) { const [form,setForm]=useState<Partial<Service>>({}); useEffect(()=>setForm(value||{}),[value]); return <FormDialog open={Boolean(value)} title={value?.id?"Editar serviço":"Novo serviço"} description="O preço será usado no site e recalculado no banco." close={close} submit={async(e)=>{e.preventDefault();await save({name:form.name,category:form.category,description:form.description||null,price:Number(form.price),unit:form.unit||null,active:form.active!==false,display_order:Number(form.display_order||0)});}}><div className="field-row"><div className="field"><label>Nome</label><input required value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>Categoria</label><input required value={form.category||""} onChange={(e)=>setForm({...form,category:e.target.value})}/></div></div><div className="field"><label>Descrição</label><textarea value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})}/></div><div className="field-row"><div className="field"><label>Preço</label><input required type="number" min="0" step="0.01" value={form.price??""} onChange={(e)=>setForm({...form,price:Number(e.target.value)})}/></div><div className="field"><label>Unidade</label><input placeholder="Ex.: a partir de" value={form.unit||""} onChange={(e)=>setForm({...form,unit:e.target.value})}/></div></div><div className="field"><label>Ordem de exibição</label><input type="number" min="0" value={form.display_order||0} onChange={(e)=>setForm({...form,display_order:Number(e.target.value)})}/></div></FormDialog>; }

function BulkAvailabilityForm({ open, close, save }: { open:boolean; close:()=>void; save:(v:{available_date:string;start_time:string;end_time:string;interval:number})=>Promise<void> }) { const [form,setForm]=useState({available_date:today,start_time:"08:00",end_time:"20:00",interval:60}); useEffect(()=>{if(open)setForm({available_date:today,start_time:"08:00",end_time:"20:00",interval:60});},[open]); return <FormDialog open={open} title="Liberar dia completo" description="Gere automaticamente todos os horários disponíveis para a data escolhida." close={close} submit={async(e)=>{e.preventDefault();await save(form);}}><div className="field"><label>Data</label><input required type="date" value={form.available_date} onChange={(e)=>setForm({...form,available_date:e.target.value})}/></div><div className="field-row"><div className="field"><label>Início</label><input required type="time" value={form.start_time} onChange={(e)=>setForm({...form,start_time:e.target.value})}/></div><div className="field"><label>Fim</label><input required type="time" value={form.end_time} onChange={(e)=>setForm({...form,end_time:e.target.value})}/></div></div><div className="field"><label>Intervalo entre horários</label><select value={form.interval} onChange={(e)=>setForm({...form,interval:Number(e.target.value)})}><option value={30}>30 minutos</option><option value={60}>1 hora</option></select></div><p className="completion-note">Ex.: 08:00 às 20:00 com intervalo de 1 hora cria 08:00, 09:00, 10:00… até 19:00. Horários já existentes não serão duplicados.</p></FormDialog>; }

function AvailabilityForm({ value, close, save }: { value:Availability|Partial<Availability>|null; close:()=>void; save:(v:Record<string,unknown>)=>Promise<void> }) { const [form,setForm]=useState<Partial<Availability>>({}); useEffect(()=>setForm(value||{}),[value]); return <FormDialog open={Boolean(value)} title={value?.id?"Editar horário":"Adicionar horário"} description="Bloqueie um horário quando ele não puder receber pedidos." close={close} submit={async(e)=>{e.preventDefault();await save({available_date:form.available_date,start_time:form.start_time,active:form.active!==false,blocked:Boolean(form.blocked),block_reason:form.block_reason||null});}}><div className="field-row"><div className="field"><label>Data</label><input required type="date" value={form.available_date||today} onChange={(e)=>setForm({...form,available_date:e.target.value})}/></div><div className="field"><label>Horário</label><input required type="time" value={String(form.start_time||"09:00").slice(0,5)} onChange={(e)=>setForm({...form,start_time:e.target.value})}/></div></div><label className="switch-field"><Switch checked={Boolean(form.blocked)} onCheckedChange={(v)=>setForm({...form,blocked:v})}/><span><strong>Bloquear horário</strong><small>Não será exibido na página pública.</small></span></label>{form.blocked&&<div className="field"><label>Motivo</label><input value={form.block_reason||""} onChange={(e)=>setForm({...form,block_reason:e.target.value})}/></div>}</FormDialog>; }

function ClientForm({ value, close, save }: { value:Client|Partial<Client>|null; close:()=>void; save:(v:Record<string,unknown>)=>Promise<void> }) { const [form,setForm]=useState<Partial<Client>>({}); useEffect(()=>setForm(value||{}),[value]); return <FormDialog open={Boolean(value)} title={value?.id?"Editar cliente":"Nova cliente"} description="Use o WhatsApp com DDD para evitar cadastros duplicados." close={close} submit={async(e)=>{e.preventDefault();await save({name:form.name,phone:form.phone,birth_date:form.birth_date||null,notes:form.notes||null});}}><div className="field-row"><div className="field"><label>Nome</label><input required value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})}/></div><div className="field"><label>WhatsApp</label><input required value={form.phone||""} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div></div><div className="field"><label>Data de nascimento</label><input type="date" value={form.birth_date||""} onChange={(e)=>setForm({...form,birth_date:e.target.value})}/></div><div className="field"><label>Observações</label><textarea value={form.notes||""} onChange={(e)=>setForm({...form,notes:e.target.value})}/></div></FormDialog>; }

function ExpenseForm({ value, close, save }: { value:Expense|Partial<Expense>|null; close:()=>void; save:(v:Record<string,unknown>)=>Promise<void> }) { const [form,setForm]=useState<Partial<Expense>>({}); useEffect(()=>setForm(value||{}),[value]); return <FormDialog open={Boolean(value)} title={value?.id?"Editar despesa":"Nova despesa"} description="Registre as saídas para acompanhar o lucro do período." close={close} submit={async(e)=>{e.preventDefault();await save({description:form.description,amount:Number(form.amount),category:form.category,expense_date:form.expense_date,payment_method:form.payment_method,notes:form.notes||null});}}><div className="field"><label>Descrição</label><input required value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})}/></div><div className="field-row"><div className="field"><label>Valor</label><input required type="number" min="0.01" step="0.01" value={form.amount??""} onChange={(e)=>setForm({...form,amount:Number(e.target.value)})}/></div><div className="field"><label>Categoria</label><input required value={form.category||""} onChange={(e)=>setForm({...form,category:e.target.value})}/></div></div><div className="field-row"><div className="field"><label>Data</label><input required type="date" value={form.expense_date||today} onChange={(e)=>setForm({...form,expense_date:e.target.value})}/></div><div className="field"><label>Pagamento</label><input required value={form.payment_method||"Pix"} onChange={(e)=>setForm({...form,payment_method:e.target.value})}/></div></div><div className="field"><label>Observações</label><textarea value={form.notes||""} onChange={(e)=>setForm({...form,notes:e.target.value})}/></div></FormDialog>; }

function AppointmentForm({ value, close, save }: { value:Appointment|Partial<Appointment>|null; close:()=>void; save:(v:Record<string,unknown>)=>Promise<void> }) { const [form,setForm]=useState<Partial<Appointment>>({}); useEffect(()=>setForm(value||{}),[value]); return <FormDialog open={Boolean(value)} title={value?.id?"Editar agendamento":"Novo agendamento"} description="Conflitos de horário serão bloqueados automaticamente." close={close} submit={async(e)=>{e.preventDefault();await save({client_name:form.client_name,client_phone:form.client_phone,service_summary:form.service_summary,scheduled_date:form.scheduled_date,scheduled_time:form.scheduled_time,total:Number(form.total),notes:form.notes||null,status:form.status||"Agendado"});}}><div className="field-row"><div className="field"><label>Cliente</label><input required value={form.client_name||""} onChange={(e)=>setForm({...form,client_name:e.target.value})}/></div><div className="field"><label>WhatsApp</label><input required value={form.client_phone||""} onChange={(e)=>setForm({...form,client_phone:e.target.value})}/></div></div><div className="field"><label>Serviço</label><input required value={form.service_summary||""} onChange={(e)=>setForm({...form,service_summary:e.target.value})}/></div><div className="field-row"><div className="field"><label>Data</label><input required type="date" value={form.scheduled_date||today} onChange={(e)=>setForm({...form,scheduled_date:e.target.value})}/></div><div className="field"><label>Horário</label><input required type="time" value={String(form.scheduled_time||"09:00").slice(0,5)} onChange={(e)=>setForm({...form,scheduled_time:e.target.value})}/></div></div><div className="field-row"><div className="field"><label>Valor</label><input required type="number" min="0" step="0.01" value={form.total??0} onChange={(e)=>setForm({...form,total:Number(e.target.value)})}/></div><div className="field"><label>Status</label><select value={form.status||"Agendado"} onChange={(e)=>setForm({...form,status:e.target.value as Appointment["status"]})}><option>Agendado</option><option>Confirmado</option><option>Cancelado</option></select></div></div><div className="field"><label>Observações</label><textarea value={form.notes||""} onChange={(e)=>setForm({...form,notes:e.target.value})}/></div></FormDialog>; }

function CompletionDialog({ value, setValue, confirm }: { value:{appointment:Appointment;payment:string}|null; setValue:(v:{appointment:Appointment;payment:string}|null)=>void; confirm:()=>void }) { const row=value?.appointment; return <Dialog open={Boolean(value)} onOpenChange={(v)=>!v&&setValue(null)}><DialogContent className="completion-dialog"><DialogHeader><DialogTitle>Concluir atendimento</DialogTitle><DialogDescription>Confirme os dados e informe como o pagamento foi realizado.</DialogDescription></DialogHeader>{row&&<><div className="completion-summary"><span><small>Cliente</small><strong>{row.client_name}</strong></span><span><small>Serviço</small><strong>{row.service_summary}</strong></span><span><small>Data e horário</small><strong>{dateBR(row.scheduled_date)} às {String(row.scheduled_time).slice(0,5)}</strong></span><span><small>Valor</small><strong>{money(row.total)}</strong></span></div><div className="field"><label>Forma de pagamento</label><Select value={value?.payment} onValueChange={(payment)=>setValue(value?{...value,payment}:null)}><SelectTrigger className="payment-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Cartão de débito">Cartão de débito</SelectItem><SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div><p className="completion-note">Ao confirmar, o valor entrará no faturamento e o recibo em PDF será baixado.</p></>}<DialogFooter><button className="admin-secondary" onClick={()=>setValue(null)}>Voltar sem concluir</button><button className="admin-primary" onClick={confirm}><Check /> Confirmar e gerar recibo</button></DialogFooter></DialogContent></Dialog>; }

function HistoryDialog({ value, close }: { value:{client:Client;appointments:Appointment[]}|null; close:()=>void }) { const total=value?.appointments.filter((r)=>r.status==="Concluído").reduce((s,r)=>s+Number(r.total),0)||0; return <Dialog open={Boolean(value)} onOpenChange={(v)=>!v&&close()}><DialogContent className="history-dialog"><DialogHeader><DialogTitle>Histórico de {value?.client.name}</DialogTitle><DialogDescription>Total gasto em atendimentos concluídos: {money(total)}</DialogDescription></DialogHeader><div className="history-list">{value?.appointments.length?value.appointments.map((row)=><div key={row.id}><i><Scissors /></i><span><strong>{row.service_summary}</strong><small>{dateBR(row.scheduled_date)} • {row.payment_method||row.status}</small></span><b>{money(row.total)}</b></div>):<Empty icon={Clock3} title="Sem histórico" text="Esta cliente ainda não possui agendamentos." />}</div></DialogContent></Dialog>; }

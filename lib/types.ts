export type StudioSettings = {
  id?: string;
  name: string;
  specialty: string;
  slogan: string;
  whatsapp: string;
  instagram: string;
  address: string;
  city: string;
  opening_hours: string;
  primary_color?: string;
  secondary_color?: string;
  thank_you_message?: string;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  unit: string | null;
  active: boolean;
  display_order: number;
  created_at?: string;
};

export type CartItem = Service & { quantity: number };

export type Promotion = {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  promotional_price: number;
  active: boolean;
};

export type AvailableSlot = {
  availability_id: string;
  date: string;
  start_time: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  birth_date?: string | null;
  notes?: string | null;
  total_spent?: number;
  created_at?: string;
};

export type Quote = {
  id: string;
  protocol?: string;
  client_name: string;
  client_phone: string;
  requested_date: string;
  requested_time: string;
  notes?: string | null;
  status: "Pendente" | "Confirmado" | "Recusado" | "Concluído" | "Cancelado";
  total: number;
  created_at: string;
  quote_items?: Array<{ id: string; service_id: string; service_name: string; quantity: number; unit_price: number; subtotal: number }>;
};

export type Appointment = {
  id: string;
  client_id?: string | null;
  client_name: string;
  client_phone: string;
  service_summary: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "Agendado" | "Confirmado" | "Concluído" | "Cancelado";
  total: number;
  notes?: string | null;
  payment_method?: string | null;
  receipt_number?: string | null;
  completed_at?: string | null;
  created_at?: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  payment_method: string;
  notes?: string | null;
  created_at?: string;
};

export const DEFAULT_SETTINGS: StudioSettings = {
  name: "Studio Capricho Hair",
  specialty: "Cabelos com técnica, cuidado e capricho",
  slogan: "Transformando seu visual com resultados personalizados.",
  whatsapp: "5511972706437",
  instagram: "@caprichoohair_",
  address: "Av. Presbítero Manoel Antônio Dias Filho, N° 1420 - Parque Res. Jundiaí, Jundiaí - SP, 13212-461",
  city: "Jundiaí, SP",
  opening_hours: "09h às 18h",
  primary_color: "#101010",
  secondary_color: "#c6a25b",
  thank_you_message: "Agradecemos a preferência e a confiança em nosso trabalho.",
};

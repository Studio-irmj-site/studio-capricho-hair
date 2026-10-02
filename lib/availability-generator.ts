export type AvailabilityGeneration = {
  available_date: string; start_time: string; end_time: string; interval: number;
  pause: boolean; pause_start: string; pause_end: string;
  repeat: boolean; until: string; weekdays: number[];
};
function minutes(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Informe horários válidos.");
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}
function dateValue(value: string) {
  const date = new Date(value + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error("Informe uma data válida.");
  return date;
}
export function generateAvailability(value: AvailabilityGeneration) {
  const start = minutes(value.start_time), end = minutes(value.end_time);
  if (end <= start) throw new Error("O horário final deve ser maior que o inicial.");
  if (!Number.isInteger(value.interval) || value.interval < 1 || value.interval > 1440) throw new Error("O intervalo deve ser um número inteiro entre 1 e 1440 minutos.");
  const pauseStart = value.pause ? minutes(value.pause_start) : 0;
  const pauseEnd = value.pause ? minutes(value.pause_end) : 0;
  if (value.pause && (pauseEnd <= pauseStart || pauseStart < start || pauseEnd > end)) throw new Error("A pausa deve estar dentro do período e terminar após seu início.");
  const first = dateValue(value.available_date), last = value.repeat ? dateValue(value.until) : first;
  if (last < first) throw new Error("A data final deve ser igual ou posterior à inicial.");
  if ((last.getTime()-first.getTime()) / 86400000 > 365) throw new Error("Escolha um período de até um ano.");
  if (value.repeat && (!value.weekdays.length || value.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6))) throw new Error("Selecione os dias da semana.");
  const rows: Array<{ available_date:string; start_time:string; active:boolean; blocked:boolean; block_reason:null }> = [];
  for (const day=new Date(first);day<=last;day.setUTCDate(day.getUTCDate()+1)) {
    if (value.repeat && !value.weekdays.includes(day.getUTCDay())) continue;
    for (let time=start;time<end;time+=value.interval) {
      if (value.pause && time>=pauseStart && time<pauseEnd) continue;
      rows.push({available_date:day.toISOString().slice(0,10),start_time:`${String(Math.floor(time/60)).padStart(2,"0")}:${String(time%60).padStart(2,"0")}`,active:true,blocked:false,block_reason:null});
      if(rows.length>10000) throw new Error("A grade excede 10.000 horários. Reduza o período ou aumente o intervalo.");
    }
  }
  if (!rows.length) throw new Error("Nenhum horário nesse período. Revise a pausa e os dias selecionados.");
  return rows;
}

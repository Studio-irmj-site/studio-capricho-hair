-- Extend the initial availability window to 08:00–20:00 (hourly).
-- This migration is additive: existing availability and booked slots are preserved.

insert into public.availability (available_date, start_time, active, blocked)
select day::date, make_time(hour_of_day, 0, 0), true, false
from generate_series(current_date, current_date + 44, interval '1 day') day
cross join generate_series(8, 19) hour_of_day
where extract(dow from day) between 2 and 6
on conflict (available_date, start_time) do nothing;

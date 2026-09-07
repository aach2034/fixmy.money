-- Permanently remove fictional records inserted by the original staff dashboard
-- migration. Every predicate uses the exact fixture signature so legitimate
-- customer data is preserved. Safe to run repeatedly.

-- Remove the obsolete client-portal demo fixture before FMM-007 requires every
-- portal row to have an explicit workspace relationship. Deleting the exact
-- account cascades only its fixture disputes, timeline events, updates,
-- documents, and chat rows. The matching Auth identity cascades its demo-only
-- profile; both statements are no-ops when the fixture is already absent.
DELETE FROM public.client_accounts
WHERE lower(btrim(email)) = 'client@demo.com'
  AND full_name = 'Sarah Johnson'
  AND phone = '(555) 234-5678';

DELETE FROM auth.users
WHERE lower(btrim(email)) = 'client@demo.com'
  AND raw_user_meta_data @> '{"full_name":"Sarah Johnson","is_client":true}'::jsonb;

DELETE FROM public.dispute_letters
WHERE letter_id IN (
  'EQ-2847', 'TU-1923', 'EX-3341', 'EQ-2901', 'EX-3190', 'TU-1887',
  'EQ-2756', 'EX-3055', 'TU-2011', 'EQ-2799', 'EX-3280', 'TU-1955'
);

DELETE FROM public.staff_clients
WHERE (name, email) IN (
  ('Darnell Washington', 'darnell.w@gmail.com'),
  ('Priya Nambiar', 'priya.nambiar@outlook.com'),
  ('Marcus Holloway', 'm.holloway@yahoo.com'),
  ('Tanisha Brooks', 'tanisha.b@gmail.com'),
  ('Roberto Fuentes', 'rfuentes@gmail.com'),
  ('Shaniqua Davis', 'shaniqua.d@hotmail.com'),
  ('Adriana Morales', 'adriana.m@gmail.com'),
  ('Jermaine Patterson', 'j.patterson@gmail.com'),
  ('Keisha Thornton', 'keisha.t@yahoo.com'),
  ('Devon Clarke', 'devon.c@gmail.com'),
  ('Monique Simmons', 'monique.s@gmail.com'),
  ('Tyler Nguyen', 'tyler.n@outlook.com')
);

DELETE FROM public.dashboard_metrics
WHERE active_clients = 147
  AND disputes_in_flight = 84
  AND items_deleted_mtd = 312
  AND overdue_tasks = 18
  AND mrr = 24780.00
  AND bureau_response_rate = 73.2
  AND letters_sent_mtd = 209
  AND new_clients_this_month = 12
  AND new_clients_this_week = 23
  AND disputes_due_this_week = 7
  AND critical_overdue_tasks = 5;

DELETE FROM public.disputes_by_bureau
WHERE (month, equifax, experian, transunion) IN (
  ('Jan', 28, 34, 22), ('Feb', 31, 29, 27), ('Mar', 42, 38, 35),
  ('Apr', 38, 44, 31), ('May', 51, 47, 42), ('Jun', 44, 52, 38)
);

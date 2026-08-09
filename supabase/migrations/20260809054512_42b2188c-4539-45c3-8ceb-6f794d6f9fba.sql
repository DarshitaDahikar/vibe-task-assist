ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner_token text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "Public demo access to tasks" ON public.tasks;

REVOKE ALL ON public.tasks FROM anon;
REVOKE ALL ON public.tasks FROM authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS tasks_owner_token_idx ON public.tasks (owner_token);
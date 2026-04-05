
ALTER TABLE public.folders ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Set initial positions based on creation order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS pos
  FROM public.folders
)
UPDATE public.folders SET position = ranked.pos FROM ranked WHERE public.folders.id = ranked.id;

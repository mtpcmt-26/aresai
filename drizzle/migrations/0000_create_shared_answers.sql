CREATE TABLE public.shared_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL,
  answer text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shared_answers TO anon;
GRANT SELECT, INSERT, DELETE ON public.shared_answers TO authenticated;
GRANT ALL ON public.shared_answers TO service_role;
ALTER TABLE public.shared_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shared answers" ON public.shared_answers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own shares" ON public.shared_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own shares" ON public.shared_answers FOR DELETE TO authenticated USING (auth.uid() = user_id);
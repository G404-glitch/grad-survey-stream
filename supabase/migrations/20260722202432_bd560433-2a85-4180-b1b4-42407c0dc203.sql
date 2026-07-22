
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answers JSONB NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  submission_attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public queue read"   ON public.survey_responses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public queue insert" ON public.survey_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public queue update" ON public.survey_responses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public queue delete" ON public.survey_responses FOR DELETE TO anon, authenticated USING (true);

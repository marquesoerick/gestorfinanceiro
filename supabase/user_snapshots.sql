-- Tabela de snapshot financeiro por usuário
CREATE TABLE IF NOT EXISTS user_snapshots (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data    JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada usuário acessa apenas o próprio snapshot
ALTER TABLE user_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own snapshot"
  ON user_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own snapshot"
  ON user_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own snapshot"
  ON user_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

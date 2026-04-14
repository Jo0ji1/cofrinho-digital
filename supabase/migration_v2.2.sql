-- ============================================
-- Cofrinho Digital v2.2 - Migration
-- Adiciona goal_id na tabela savings para suporte a múltiplos objetivos
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Adicionar coluna goal_id na tabela savings
ALTER TABLE savings
  ADD COLUMN IF NOT EXISTS goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL;

-- Atualizar savings existentes: vincular ao primeiro objetivo do usuário
UPDATE savings s
SET goal_id = (
  SELECT g.id FROM goals g
  WHERE g.user_id = s.user_id
  ORDER BY g.created_at ASC
  LIMIT 1
)
WHERE s.goal_id IS NULL;

-- Índice para consultas por goal_id
CREATE INDEX IF NOT EXISTS idx_savings_goal_id ON savings(goal_id);

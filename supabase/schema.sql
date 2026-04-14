-- ============================================
-- Cofrinho Digital v2.0 - Schema do Supabase
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Tabela de perfis (extensão do auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de objetivos
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  target_amount NUMERIC(12,2) NOT NULL,
  target_date DATE NOT NULL,
  active_modality TEXT NOT NULL DEFAULT 'daily' CHECK (active_modality IN ('daily','weekly','monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias padrão
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'cash-outline',
  color TEXT NOT NULL DEFAULT '#10B981',
  is_default BOOLEAN DEFAULT FALSE
);

-- Tabela de economias
CREATE TABLE IF NOT EXISTS savings (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) - Governança
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário só acessa seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Goals: usuário só acessa seus próprios objetivos
CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Categories: acessa categorias padrão OU as próprias
CREATE POLICY "Users can view own or default categories" ON categories FOR SELECT USING (is_default = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- Savings: usuário só acessa suas próprias economias
CREATE POLICY "Users can view own savings" ON savings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings" ON savings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings" ON savings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings" ON savings FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Categorias padrão (inserir após criar tabela)
-- ============================================
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('Alimentação', 'restaurant-outline', '#EF4444', TRUE),
  ('Transporte', 'car-outline', '#3B82F6', TRUE),
  ('Lazer', 'game-controller-outline', '#8B5CF6', TRUE),
  ('Compras', 'cart-outline', '#F59E0B', TRUE),
  ('Saúde', 'heart-outline', '#EC4899', TRUE),
  ('Educação', 'school-outline', '#06B6D4', TRUE),
  ('Moradia', 'home-outline', '#14B8A6', TRUE),
  ('Outro', 'cash-outline', '#6B7280', TRUE);

-- ============================================
-- Trigger: criar perfil automático no registro
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, onboarding_completed)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), FALSE);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

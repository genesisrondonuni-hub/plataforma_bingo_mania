-- Crear tabla de usuarios con todos los campos requeridos
CREATE TABLE IF NOT EXISTS public.users_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    telefono TEXT,
    avatar TEXT DEFAULT 'avatar-default.png',
    tokens INTEGER DEFAULT 0,
    tema TEXT DEFAULT 'oscuro' CHECK (tema IN ('oscuro', 'claro')),
    is_admin BOOLEAN DEFAULT FALSE,
    
    -- Datos bancarios para pago móvil
    banco TEXT,
    codigo_banco TEXT,
    cedula TEXT,
    telefono_pago TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users_2025_09_28_19_00(email);
CREATE INDEX IF NOT EXISTS idx_users_tokens ON public.users_2025_09_28_19_00(tokens);

-- Habilitar RLS
ALTER TABLE public.users_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver y editar su propio perfil
CREATE POLICY "Users can view own profile" ON public.users_2025_09_28_19_00
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users_2025_09_28_19_00
    FOR UPDATE USING (auth.uid() = id);

-- Política para admins (pueden ver todos los usuarios)
CREATE POLICY "Admins can view all users" ON public.users_2025_09_28_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_2025_09_28_19_00 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users_2025_09_28_19_00
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
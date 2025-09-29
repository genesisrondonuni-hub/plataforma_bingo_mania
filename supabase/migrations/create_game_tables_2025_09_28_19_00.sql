-- Crear tabla de salas de juego
CREATE TABLE IF NOT EXISTS public.salas_juego_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_sala INTEGER NOT NULL,
    estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'llena', 'en_juego', 'terminada')),
    max_jugadores INTEGER DEFAULT 50,
    jugadores_actuales INTEGER DEFAULT 0,
    costo_carton INTEGER NOT NULL,
    pozo_total DECIMAL(10,2) DEFAULT 0,
    premio_total DECIMAL(10,2) DEFAULT 0,
    tipo_juego TEXT DEFAULT 'tradicional_75' CHECK (tipo_juego IN ('tradicional_75', 'bingo_90', 'blackout', 'patrones')),
    patron_ganador TEXT,
    numeros_cantados INTEGER[] DEFAULT '{}',
    ganador_id UUID REFERENCES public.users_2025_09_28_19_00(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Crear tabla de cartones
CREATE TABLE IF NOT EXISTS public.cartones_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sala_id UUID NOT NULL REFERENCES public.salas_juego_2025_09_28_19_00(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_2025_09_28_19_00(id) ON DELETE CASCADE,
    numeros INTEGER[] NOT NULL,
    numeros_marcados INTEGER[] DEFAULT '{}',
    es_ganador BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS public.chat_mensajes_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sala_id UUID NOT NULL REFERENCES public.salas_juego_2025_09_28_19_00(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_2025_09_28_19_00(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de clasificaciones
CREATE TABLE IF NOT EXISTS public.clasificaciones_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_2025_09_28_19_00(id) ON DELETE CASCADE,
    partidas_jugadas INTEGER DEFAULT 0,
    partidas_ganadas INTEGER DEFAULT 0,
    tokens_ganados INTEGER DEFAULT 0,
    racha_actual INTEGER DEFAULT 0,
    mejor_racha INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_salas_estado ON public.salas_juego_2025_09_28_19_00(estado);
CREATE INDEX IF NOT EXISTS idx_salas_numero ON public.salas_juego_2025_09_28_19_00(numero_sala);
CREATE INDEX IF NOT EXISTS idx_cartones_sala ON public.cartones_2025_09_28_19_00(sala_id);
CREATE INDEX IF NOT EXISTS idx_cartones_user ON public.cartones_2025_09_28_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sala ON public.chat_mensajes_2025_09_28_19_00(sala_id);
CREATE INDEX IF NOT EXISTS idx_clasificaciones_user ON public.clasificaciones_2025_09_28_19_00(user_id);

-- Habilitar RLS
ALTER TABLE public.salas_juego_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartones_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensajes_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificaciones_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;

-- Políticas para salas (todos los usuarios autenticados pueden ver)
CREATE POLICY "Authenticated users can view rooms" ON public.salas_juego_2025_09_28_19_00
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para cartones (usuarios pueden ver sus propios cartones)
CREATE POLICY "Users can view own cards" ON public.cartones_2025_09_28_19_00
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cards" ON public.cartones_2025_09_28_19_00
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para chat (usuarios autenticados pueden ver y crear mensajes)
CREATE POLICY "Authenticated users can view chat" ON public.chat_mensajes_2025_09_28_19_00
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create chat messages" ON public.chat_mensajes_2025_09_28_19_00
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para clasificaciones (todos pueden ver, usuarios pueden actualizar las suyas)
CREATE POLICY "Authenticated users can view rankings" ON public.clasificaciones_2025_09_28_19_00
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own rankings" ON public.clasificaciones_2025_09_28_19_00
    FOR UPDATE USING (auth.uid() = user_id);
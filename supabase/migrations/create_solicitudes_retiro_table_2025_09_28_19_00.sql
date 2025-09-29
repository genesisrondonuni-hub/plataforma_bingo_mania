-- Crear tabla de solicitudes de retiro
CREATE TABLE IF NOT EXISTS public.solicitudes_retiro_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_2025_09_28_19_00(id) ON DELETE CASCADE,
    tokens_solicitados INTEGER NOT NULL CHECK (tokens_solicitados > 0),
    monto_bs DECIMAL(10,2) NOT NULL,
    monto_usd DECIMAL(10,4) NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'procesado')),
    codigo_referencia TEXT,
    notas_admin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_solicitudes_user_id ON public.solicitudes_retiro_2025_09_28_19_00(user_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON public.solicitudes_retiro_2025_09_28_19_00(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON public.solicitudes_retiro_2025_09_28_19_00(created_at);

-- Habilitar RLS
ALTER TABLE public.solicitudes_retiro_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view own requests" ON public.solicitudes_retiro_2025_09_28_19_00
    FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create own requests" ON public.solicitudes_retiro_2025_09_28_19_00
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo admins pueden ver todas las solicitudes
CREATE POLICY "Admins can view all requests" ON public.solicitudes_retiro_2025_09_28_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_2025_09_28_19_00 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Solo admins pueden actualizar solicitudes
CREATE POLICY "Admins can update requests" ON public.solicitudes_retiro_2025_09_28_19_00
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users_2025_09_28_19_00 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );
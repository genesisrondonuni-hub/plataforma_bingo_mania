-- Crear tabla de configuración económica
CREATE TABLE IF NOT EXISTS public.config_economica_2025_09_28_19_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_bs DECIMAL(10,2) DEFAULT 1.00,
    token_usd DECIMAL(10,4) DEFAULT 0.0270,
    costo_carton INTEGER DEFAULT 5,
    porcentaje_premio INTEGER DEFAULT 70 CHECK (porcentaje_premio >= 0 AND porcentaje_premio <= 100),
    velocidad_juego INTEGER DEFAULT 3 CHECK (velocidad_juego >= 1 AND velocidad_juego <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO public.config_economica_2025_09_28_19_00 (token_bs, token_usd, costo_carton, porcentaje_premio, velocidad_juego)
VALUES (1.00, 0.0270, 5, 70, 3)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.config_economica_2025_09_28_19_00 ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y modificar la configuración
CREATE POLICY "Only admins can view config" ON public.config_economica_2025_09_28_19_00
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_2025_09_28_19_00 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Only admins can update config" ON public.config_economica_2025_09_28_19_00
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users_2025_09_28_19_00 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Trigger para actualizar updated_at
CREATE TRIGGER update_config_updated_at 
    BEFORE UPDATE ON public.config_economica_2025_09_28_19_00
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
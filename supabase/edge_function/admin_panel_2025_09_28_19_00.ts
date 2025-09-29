import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name',
}

interface Database {
  public: {
    Tables: {
      users_2025_09_28_19_00: {
        Row: {
          id: string
          is_admin: boolean
          tokens: number
        }
      }
      config_economica_2025_09_28_19_00: {
        Row: {
          id: string
          token_bs: number
          token_usd: number
          costo_carton: number
          porcentaje_premio: number
          velocidad_juego: number
        }
      }
      solicitudes_retiro_2025_09_28_19_00: {
        Row: {
          id: string
          user_id: string
          tokens_solicitados: number
          monto_bs: number
          monto_usd: number
          estado: string
          created_at: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Verificar que el usuario es admin
    const { data: userData } = await supabaseClient
      .from('users_2025_09_28_19_00')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      throw new Error('No tienes permisos de administrador')
    }

    const { action, ...params } = await req.json()

    switch (action) {
      case 'get_config':
        return await getConfig(supabaseClient)
      
      case 'update_config':
        return await updateConfig(supabaseClient, params)
      
      case 'get_withdrawal_requests':
        return await getWithdrawalRequests(supabaseClient)
      
      case 'process_withdrawal':
        return await processWithdrawal(supabaseClient, params)
      
      case 'get_users':
        return await getUsers(supabaseClient)
      
      case 'add_tokens':
        return await addTokens(supabaseClient, params)
      
      default:
        throw new Error('Acción no válida')
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function getConfig(supabaseClient: any) {
  const { data: config, error } = await supabaseClient
    .from('config_economica_2025_09_28_19_00')
    .select('*')
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ config }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateConfig(supabaseClient: any, params: any) {
  const { token_bs, token_usd, costo_carton, porcentaje_premio, velocidad_juego } = params

  const { data: config, error } = await supabaseClient
    .from('config_economica_2025_09_28_19_00')
    .update({
      token_bs,
      token_usd,
      costo_carton,
      porcentaje_premio,
      velocidad_juego,
      updated_at: new Date().toISOString()
    })
    .eq('id', (await supabaseClient.from('config_economica_2025_09_28_19_00').select('id').single()).data.id)
    .select()
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, config }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getWithdrawalRequests(supabaseClient: any) {
  const { data: solicitudes, error } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .select(`
      *,
      users_2025_09_28_19_00 (
        nombre,
        apellido,
        email,
        telefono,
        banco,
        codigo_banco,
        cedula,
        telefono_pago
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ solicitudes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function processWithdrawal(supabaseClient: any, params: any) {
  const { solicitudId, estado, notas_admin } = params

  // Obtener la solicitud
  const { data: solicitud } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .select('*')
    .eq('id', solicitudId)
    .single()

  if (!solicitud) {
    throw new Error('Solicitud no encontrada')
  }

  // Si se rechaza, devolver tokens al usuario
  if (estado === 'rechazado' && solicitud.estado === 'pendiente') {
    const { data: user } = await supabaseClient
      .from('users_2025_09_28_19_00')
      .select('tokens')
      .eq('id', solicitud.user_id)
      .single()

    await supabaseClient
      .from('users_2025_09_28_19_00')
      .update({ tokens: user.tokens + solicitud.tokens_solicitados })
      .eq('id', solicitud.user_id)
  }

  // Actualizar solicitud
  const { error } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .update({
      estado,
      notas_admin,
      processed_at: new Date().toISOString()
    })
    .eq('id', solicitudId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getUsers(supabaseClient: any) {
  const { data: users, error } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('id, nombre, apellido, email, telefono, tokens, banco, codigo_banco, cedula, telefono_pago, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ users }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function addTokens(supabaseClient: any, params: any) {
  const { userId, tokens, codigo_referencia } = params

  // Obtener usuario actual
  const { data: user } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('tokens')
    .eq('id', userId)
    .single()

  if (!user) {
    throw new Error('Usuario no encontrado')
  }

  // Actualizar tokens
  const { error } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .update({ tokens: user.tokens + tokens })
    .eq('id', userId)

  if (error) throw error

  return new Response(
    JSON.stringify({ 
      success: true, 
      nuevos_tokens: user.tokens + tokens 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
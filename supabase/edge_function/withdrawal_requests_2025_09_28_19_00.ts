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
          tokens: number
        }
      }
      config_economica_2025_09_28_19_00: {
        Row: {
          token_bs: number
          token_usd: number
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

    const { action, tokens_solicitados } = await req.json()

    switch (action) {
      case 'create_withdrawal_request':
        return await createWithdrawalRequest(supabaseClient, user.id, tokens_solicitados)
      
      case 'get_my_requests':
        return await getMyRequests(supabaseClient, user.id)
      
      case 'cancel_request':
        const { requestId } = await req.json()
        return await cancelRequest(supabaseClient, user.id, requestId)
      
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

async function createWithdrawalRequest(supabaseClient: any, userId: string, tokensSolicitados: number) {
  if (tokensSolicitados <= 0) {
    throw new Error('La cantidad de tokens debe ser mayor a 0')
  }

  // Verificar tokens del usuario
  const { data: user } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('tokens, banco, codigo_banco, cedula, telefono_pago')
    .eq('id', userId)
    .single()

  if (!user) {
    throw new Error('Usuario no encontrado')
  }

  if (user.tokens < tokensSolicitados) {
    throw new Error('No tienes suficientes tokens')
  }

  // Verificar que tenga datos bancarios
  if (!user.banco || !user.codigo_banco || !user.cedula || !user.telefono_pago) {
    throw new Error('Debes completar tus datos bancarios antes de solicitar un retiro')
  }

  // Obtener configuración de precios
  const { data: config } = await supabaseClient
    .from('config_economica_2025_09_28_19_00')
    .select('token_bs, token_usd')
    .single()

  if (!config) {
    throw new Error('Error al obtener configuración de precios')
  }

  const montoBs = tokensSolicitados * config.token_bs
  const montoUsd = tokensSolicitados * config.token_usd

  // Descontar tokens temporalmente (se devuelven si se rechaza)
  const { error: updateError } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .update({ tokens: user.tokens - tokensSolicitados })
    .eq('id', userId)

  if (updateError) throw updateError

  // Crear solicitud de retiro
  const { data: solicitud, error } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .insert({
      user_id: userId,
      tokens_solicitados: tokensSolicitados,
      monto_bs: montoBs,
      monto_usd: montoUsd,
      estado: 'pendiente'
    })
    .select()
    .single()

  if (error) {
    // Si hay error, devolver los tokens
    await supabaseClient
      .from('users_2025_09_28_19_00')
      .update({ tokens: user.tokens })
      .eq('id', userId)
    
    throw error
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      solicitud,
      tokensRestantes: user.tokens - tokensSolicitados,
      montoBs,
      montoUsd
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getMyRequests(supabaseClient: any, userId: string) {
  const { data: solicitudes, error } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ solicitudes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function cancelRequest(supabaseClient: any, userId: string, requestId: string) {
  // Obtener la solicitud
  const { data: solicitud } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', userId)
    .single()

  if (!solicitud) {
    throw new Error('Solicitud no encontrada')
  }

  if (solicitud.estado !== 'pendiente') {
    throw new Error('Solo se pueden cancelar solicitudes pendientes')
  }

  // Devolver tokens al usuario
  const { data: user } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('tokens')
    .eq('id', userId)
    .single()

  await supabaseClient
    .from('users_2025_09_28_19_00')
    .update({ tokens: user.tokens + solicitud.tokens_solicitados })
    .eq('id', userId)

  // Actualizar solicitud a cancelada
  const { error } = await supabaseClient
    .from('solicitudes_retiro_2025_09_28_19_00')
    .update({ estado: 'cancelado' })
    .eq('id', requestId)

  if (error) throw error

  return new Response(
    JSON.stringify({ 
      success: true,
      tokensDevueltos: solicitud.tokens_solicitados
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
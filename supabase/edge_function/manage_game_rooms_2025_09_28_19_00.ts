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
          is_admin: boolean
        }
      }
      salas_juego_2025_09_28_19_00: {
        Row: {
          id: string
          numero_sala: number
          estado: string
          jugadores_actuales: number
          max_jugadores: number
          costo_carton: number
          pozo_total: number
        }
      }
      config_economica_2025_09_28_19_00: {
        Row: {
          costo_carton: number
          porcentaje_premio: number
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

    const { action, salaId, numeroCarton } = await req.json()

    switch (action) {
      case 'get_rooms':
        return await getRooms(supabaseClient)
      
      case 'create_room':
        return await createRoom(supabaseClient)
      
      case 'join_room':
        return await joinRoom(supabaseClient, user.id, salaId, numeroCarton)
      
      case 'start_game':
        return await startGame(supabaseClient, user.id, salaId)
      
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

async function getRooms(supabaseClient: any) {
  const { data: salas, error } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .select('*')
    .order('numero_sala', { ascending: true })

  if (error) throw error

  return new Response(
    JSON.stringify({ salas }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createRoom(supabaseClient: any) {
  // Obtener configuración actual
  const { data: config } = await supabaseClient
    .from('config_economica_2025_09_28_19_00')
    .select('costo_carton')
    .single()

  // Obtener el último número de sala
  const { data: lastRoom } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .select('numero_sala')
    .order('numero_sala', { ascending: false })
    .limit(1)
    .single()

  const nuevoNumero = (lastRoom?.numero_sala || 0) + 1

  const { data: nuevaSala, error } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .insert({
      numero_sala: nuevoNumero,
      costo_carton: config?.costo_carton || 5,
      estado: 'abierta'
    })
    .select()
    .single()

  if (error) throw error

  return new Response(
    JSON.stringify({ sala: nuevaSala }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function joinRoom(supabaseClient: any, userId: string, salaId: string, numeroCarton: number) {
  // Verificar tokens del usuario
  const { data: user } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('tokens')
    .eq('id', userId)
    .single()

  // Obtener información de la sala
  const { data: sala } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .select('*')
    .eq('id', salaId)
    .single()

  if (!sala || sala.estado !== 'abierta') {
    throw new Error('La sala no está disponible')
  }

  if (user.tokens < sala.costo_carton) {
    throw new Error('No tienes suficientes tokens')
  }

  if (sala.jugadores_actuales >= sala.max_jugadores) {
    throw new Error('La sala está llena')
  }

  // Generar números del cartón (bingo 75 bolas)
  const numeros = generateBingoCard()

  // Crear cartón
  const { error: cartonError } = await supabaseClient
    .from('cartones_2025_09_28_19_00')
    .insert({
      sala_id: salaId,
      user_id: userId,
      numeros: numeros
    })

  if (cartonError) throw cartonError

  // Descontar tokens
  const { error: tokenError } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .update({ tokens: user.tokens - sala.costo_carton })
    .eq('id', userId)

  if (tokenError) throw tokenError

  // Actualizar sala
  const nuevosJugadores = sala.jugadores_actuales + 1
  const nuevoPozo = sala.pozo_total + sala.costo_carton
  const nuevoEstado = nuevosJugadores >= sala.max_jugadores ? 'llena' : 'abierta'

  const { error: salaError } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .update({
      jugadores_actuales: nuevosJugadores,
      pozo_total: nuevoPozo,
      estado: nuevoEstado
    })
    .eq('id', salaId)

  if (salaError) throw salaError

  return new Response(
    JSON.stringify({ 
      success: true, 
      carton: numeros,
      tokensRestantes: user.tokens - sala.costo_carton
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function startGame(supabaseClient: any, userId: string, salaId: string) {
  // Verificar que el usuario es admin
  const { data: user } = await supabaseClient
    .from('users_2025_09_28_19_00')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (!user?.is_admin) {
    throw new Error('No tienes permisos para iniciar el juego')
  }

  // Obtener configuración del premio
  const { data: config } = await supabaseClient
    .from('config_economica_2025_09_28_19_00')
    .select('porcentaje_premio')
    .single()

  // Obtener sala
  const { data: sala } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .select('*')
    .eq('id', salaId)
    .single()

  if (sala.estado !== 'llena') {
    throw new Error('La sala debe estar llena para iniciar')
  }

  const premioTotal = (sala.pozo_total * (config?.porcentaje_premio || 70)) / 100

  // Actualizar sala a estado "en_juego"
  const { error } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .update({
      estado: 'en_juego',
      premio_total: premioTotal,
      started_at: new Date().toISOString()
    })
    .eq('id', salaId)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, premioTotal }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function generateBingoCard(): number[] {
  const card: number[] = []
  
  // Columna B (1-15)
  const bNumbers = getRandomNumbers(1, 15, 5)
  card.push(...bNumbers)
  
  // Columna I (16-30)
  const iNumbers = getRandomNumbers(16, 30, 5)
  card.push(...iNumbers)
  
  // Columna N (31-45) - con espacio libre en el centro
  const nNumbers = getRandomNumbers(31, 45, 4)
  card.push(...nNumbers.slice(0, 2), 0, ...nNumbers.slice(2)) // 0 representa espacio libre
  
  // Columna G (46-60)
  const gNumbers = getRandomNumbers(46, 60, 5)
  card.push(...gNumbers)
  
  // Columna O (61-75)
  const oNumbers = getRandomNumbers(61, 75, 5)
  card.push(...oNumbers)
  
  return card
}

function getRandomNumbers(min: number, max: number, count: number): number[] {
  const numbers: number[] = []
  const available = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length)
    numbers.push(available.splice(randomIndex, 1)[0])
  }
  
  return numbers
}
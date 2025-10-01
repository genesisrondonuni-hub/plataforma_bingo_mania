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
          premio_total: number
          numeros_cantados: number[]
          ganador_id: string | null
        }
      }
      cartones_2025_09_28_19_00: {
        Row: {
          id: string
          user_id: string
          sala_id: string
          numeros: number[]
          es_ganador: boolean
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

    const { action, salaId, numeroCarton, cartonId } = await req.json()

    switch (action) {
      case 'get_rooms':
        return await getRooms(supabaseClient)
      
      case 'create_room':
        return await createRoom(supabaseClient)
      
      case 'join_room':
        return await joinRoom(supabaseClient, user.id, salaId, numeroCarton)
      
      case 'start_game':
        return await startGame(supabaseClient, user.id, salaId)
      
      case 'call_number':
        return await callNextNumber(supabaseClient, salaId)

      case 'check_bingo':
        return await checkWinner(supabaseClient, user.id, salaId, cartonId)
      
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

async function callNextNumber(supabaseClient: any, salaId: string) {
  const { data: sala, error: salaError } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .select('numeros_cantados, estado')
    .eq('id', salaId)
    .single()

  if (salaError) throw salaError
  if (sala.estado !== 'en_juego') throw new Error('El juego no ha iniciado o ya ha terminado.')

  const numerosCantados = sala.numeros_cantados || []
  if (numerosCantados.length >= 75) {
    // Opcional: finalizar el juego si se cantan todos los números
    await supabaseClient.from('salas_juego_2025_09_28_19_00').update({ estado: 'terminada' }).eq('id', salaId)
    return new Response(JSON.stringify({ message: 'Todos los números han sido cantados.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const numerosDisponibles = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !numerosCantados.includes(n))
  const nuevoNumero = numerosDisponibles[Math.floor(Math.random() * numerosDisponibles.length)]

  const { data: updatedSala, error: updateError } = await supabaseClient
    .from('salas_juego_2025_09_28_19_00')
    .update({ numeros_cantados: [...numerosCantados, nuevoNumero] })
    .eq('id', salaId)
    .select('numeros_cantados')
    .single()

  if (updateError) throw updateError

  return new Response(JSON.stringify({ success: true, nuevoNumero, numeros_cantados: updatedSala.numeros_cantados }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function checkWinner(supabaseClient: any, userId: string, salaId: string, cartonId: string) {
  // 1. Obtener datos de la sala y el cartón
  const { data: sala } = await supabaseClient.from('salas_juego_2025_09_28_19_00').select('*').eq('id', salaId).single()
  const { data: carton } = await supabaseClient.from('cartones_2025_09_28_19_00').select('*').eq('id', cartonId).single()

  // 2. Validaciones
  if (!sala || !carton) throw new Error('Sala o cartón no encontrado.')
  if (sala.estado !== 'en_juego') throw new Error('El juego no está activo.')
  if (carton.user_id !== userId) throw new Error('Este cartón no te pertenece.')

  // 3. Comprobar si es un bingo válido
  const esGanador = isBingo(carton.numeros, sala.numeros_cantados)

  if (!esGanador) {
    return new Response(JSON.stringify({ success: false, message: 'No es un bingo válido.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // 4. Procesar al ganador
  // Usar una transacción para asegurar la atomicidad
  const { data: userData, error: userError } = await supabaseClient.from('users_2025_09_28_19_00').select('tokens').eq('id', userId).single()
  if(userError) throw userError

  const nuevosTokens = userData.tokens + sala.premio_total

  // Actualizar usuario
  const { error: updateUserError } = await supabaseClient.from('users_2025_09_28_19_00').update({ tokens: nuevosTokens }).eq('id', userId)
  if(updateUserError) throw updateUserError

  // Actualizar cartón
  await supabaseClient.from('cartones_2025_09_28_19_00').update({ es_ganador: true }).eq('id', cartonId)

  // Actualizar sala
  await supabaseClient.from('salas_juego_2025_09_28_19_00').update({ 
    estado: 'terminada', 
    ganador_id: userId, 
    finished_at: new Date().toISOString() 
  }).eq('id', salaId)

  return new Response(JSON.stringify({ success: true, message: `¡Felicidades, has ganado ${sala.premio_total} tokens!`, premio: sala.premio_total }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function isBingo(cardNumbers: number[], calledNumbers: number[]): boolean {
  const winningPatterns = [
    // Horizontales
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    // Verticales
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    // Diagonales
    [0, 6, 12, 18, 24],
    [4, 8, 12, 16, 20]
  ];

  for (const pattern of winningPatterns) {
    const isWinner = pattern.every(index => {
      const number = cardNumbers[index];
      // El espacio libre (0) siempre cuenta como marcado
      return number === 0 || calledNumbers.includes(number);
    });
    if (isWinner) return true;
  }

  return false;
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
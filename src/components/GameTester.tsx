import { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from './ui/button';

export function GameTester() {
  const [salaId, setSalaId] = useState<string | null>(null);
  const [cartonId, setCartonId] = useState<string | null>(null);
  const [myCard, setMyCard] = useState<number[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, message]);
  };

  const handleApiCall = async (action: string, params: object = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToLog('Error: No estás autenticado.');
        return;
      }

      addToLog(`Llamando a la función con acción: ${action}...`);
      const { data, error } = await supabase.functions.invoke('manage_game_rooms_2025_09_28_19_00', {
        body: JSON.stringify({ action, ...params }),
      });

      if (error) {
        throw new Error(error.message);
      }
      
      addToLog(`Respuesta de ${action}: ${JSON.stringify(data, null, 2)}`);

      // Manejar respuestas específicas
      if (action === 'create_room' && data.sala) {
        setSalaId(data.sala.id);
      }
      if (action === 'join_room' && data.carton) {
        setMyCard(data.carton.numeros);
        // Necesitamos obtener el ID del cartón recién creado
        const { data: cartonesData } = await supabase
          .from('cartones_2025_09_28_19_00')
          .select('id')
          .eq('sala_id', salaId)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (cartonesData) {
            setCartonId(cartonesData.id);
            addToLog(`ID de tu cartón: ${cartonesData.id}`);
        }
      }
      if (action === 'call_number') {
        setCalledNumbers(data.numeros_cantados || []);
      }

    } catch (e: any) {
      addToLog(`Error en ${action}: ${e.message}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg max-w-4xl mx-auto my-8 bg-card text-card-foreground">
      <h2 className="text-2xl font-bold mb-4">Tester de Lógica de Juego</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
            <Button onClick={() => handleApiCall('create_room')} >1. Crear Sala</Button>
            <Button onClick={() => handleApiCall('join_room', { salaId })} disabled={!salaId}>2. Unirse a Sala</Button>
            <Button onClick={() => handleApiCall('start_game', { salaId })} disabled={!salaId}>3. Iniciar Juego (Admin)</Button>
            <Button onClick={() => handleApiCall('call_number', { salaId })} disabled={!salaId}>4. Cantar Número</Button>
            <Button onClick={() => handleApiCall('check_bingo', { salaId, cartonId })} disabled={!salaId || !cartonId}>5. ¡Revisar BINGO!</Button>
        </div>
        <div className="bg-muted p-4 rounded-md h-96 overflow-y-auto">
            <h3 className="font-semibold">Log de Actividad</h3>
            <ul className="text-sm font-mono list-disc list-inside">
                {log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Información Actual</h3>
        <p>Sala ID: <span className="font-mono">{salaId || 'N/A'}</span></p>
        <p>Cartón ID: <span className="font-mono">{cartonId || 'N/A'}</span></p>
        <div className="mt-2">
            <h4 className="font-semibold">Mi Cartón:</h4>
            {myCard.length > 0 ? (
                <div className="grid grid-cols-5 gap-1 p-2 border rounded w-40 text-center bg-background">
                    {myCard.map((num, i) => <div key={i} className={`w-6 h-6 flex items-center justify-center rounded ${calledNumbers.includes(num) ? 'bg-primary text-primary-foreground' : ''}`}>{num === 0 ? '★' : num}</div>)}
                </div>
            ) : <p>N/A</p>}
        </div>
        <div className="mt-2">
            <h4 className="font-semibold">Números Cantados:</h4>
            <div className="flex flex-wrap gap-2">
                {calledNumbers.map(num => <span key={num} className="font-mono p-1 bg-secondary rounded">{num}</span>)}
            </div>
        </div>
      </div>
    </div>
  );
}
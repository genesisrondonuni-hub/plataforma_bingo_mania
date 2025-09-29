import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Play, Clock, Trophy, Plus, Settings, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Sala {
  id: string;
  numero_sala: number;
  estado: 'abierta' | 'llena' | 'en_juego' | 'terminada';
  jugadores_actuales: number;
  max_jugadores: number;
  costo_carton: number;
  pozo_total: number;
  premio_total: number;
}

interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  tokens: number;
  avatar: string;
  is_admin: boolean;
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadSalas();
      
      // Actualizar salas cada 5 segundos
      const interval = setInterval(loadSalas, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users_2025_09_28_19_00')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSalas = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage_game_rooms_2025_09_28_19_00', {
        body: { action: 'get_rooms' }
      });

      if (error) throw error;
      setSalas(data.salas || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewRoom = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage_game_rooms_2025_09_28_19_00', {
        body: { action: 'create_room' }
      });

      if (error) throw error;
      
      toast({
        title: "Nueva sala creada",
        description: `Sala #${data.sala.numero_sala} está lista para jugar`,
      });
      
      loadSalas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const joinRoom = async (salaId: string) => {
    if (!userProfile) return;

    const sala = salas.find(s => s.id === salaId);
    if (!sala) return;

    if (userProfile.tokens < sala.costo_carton) {
      toast({
        title: "Tokens insuficientes",
        description: `Necesitas ${sala.costo_carton} tokens para unirte a esta sala`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage_game_rooms_2025_09_28_19_00', {
        body: { 
          action: 'join_room',
          salaId: salaId,
          numeroCarton: 1
        }
      });

      if (error) throw error;
      
      toast({
        title: "¡Te has unido a la sala!",
        description: `Cartón generado. Tokens restantes: ${data.tokensRestantes}`,
      });
      
      // Actualizar perfil y salas
      loadUserProfile();
      loadSalas();
      
      // Navegar a la sala de juego (implementar después)
      // navigate(`/game/${salaId}`);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      abierta: 'bg-green-500 hover:bg-green-600',
      llena: 'bg-yellow-500 hover:bg-yellow-600',
      en_juego: 'bg-red-500 hover:bg-red-600',
      terminada: 'bg-gray-500 hover:bg-gray-600'
    };

    const labels = {
      abierta: 'Abierta',
      llena: 'Llena',
      en_juego: 'En Juego',
      terminada: 'Terminada'
    };

    return (
      <Badge className={variants[estado as keyof typeof variants]}>
        {labels[estado as keyof typeof labels]}
      </Badge>
    );
  };

  const getActionButton = (sala: Sala) => {
    switch (sala.estado) {
      case 'abierta':
        return (
          <Button 
            onClick={() => joinRoom(sala.id)}
            className="w-full gradient-bg hover:opacity-90"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Unirse ({sala.costo_carton} tokens)
          </Button>
        );
      case 'llena':
        return (
          <Button disabled className="w-full" size="sm">
            Sala Llena
          </Button>
        );
      case 'en_juego':
        return (
          <Button variant="outline" className="w-full" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            En Juego
          </Button>
        );
      case 'terminada':
        return (
          <Button variant="secondary" className="w-full" size="sm">
            <Trophy className="w-4 h-4 mr-2" />
            Ver Resultados
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="glass-card border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold neon-text">🎱 Bingo Manía</h1>
          </div>
          
          {userProfile && (
            <div className="flex items-center space-x-4">
              <div className="text-right text-white">
                <p className="font-semibold">{userProfile.nombre} {userProfile.apellido}</p>
                <p className="text-sm text-cyan-400">{userProfile.tokens} tokens</p>
              </div>
              <Avatar>
                <AvatarImage src={`/images/${userProfile.avatar}`} />
                <AvatarFallback>{userProfile.nombre[0]}{userProfile.apellido[0]}</AvatarFallback>
              </Avatar>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Salas de Juego</h2>
          <Button onClick={createNewRoom} className="gradient-bg hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sala
          </Button>
        </div>

        {/* Salas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salas.map((sala) => (
            <Card key={sala.id} className="glass-card border-white/20">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Sala #{sala.numero_sala}</CardTitle>
                  {getEstadoBadge(sala.estado)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {sala.jugadores_actuales}/{sala.max_jugadores}
                  </div>
                  <div className="text-cyan-400 font-semibold">
                    Pozo: {sala.pozo_total} tokens
                  </div>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(sala.jugadores_actuales / sala.max_jugadores) * 100}%` }}
                  ></div>
                </div>
                
                {getActionButton(sala)}
              </CardContent>
            </Card>
          ))}
        </div>

        {salas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">No hay salas disponibles</div>
            <Button onClick={createNewRoom} className="gradient-bg hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Sala
            </Button>
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="flex justify-around">
          <Button variant="ghost" size="sm" className="flex-col">
            <Play className="w-5 h-5" />
            <span className="text-xs">Jugar</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col">
            <Trophy className="w-5 h-5" />
            <span className="text-xs">Ranking</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col">
            <Settings className="w-5 h-5" />
            <span className="text-xs">Perfil</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, DollarSign, Users, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Config {
  id: string;
  token_bs: number;
  token_usd: number;
  costo_carton: number;
  porcentaje_premio: number;
  velocidad_juego: number;
}

interface SolicitudRetiro {
  id: string;
  user_id: string;
  tokens_solicitados: number;
  monto_bs: number;
  monto_usd: number;
  estado: string;
  created_at: string;
  users_2025_09_28_19_00: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    banco: string;
    codigo_banco: string;
    cedula: string;
    telefono_pago: string;
  };
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  tokens: number;
  banco: string;
  codigo_banco: string;
  cedula: string;
  telefono_pago: string;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudRetiro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [tokensToAdd, setTokensToAdd] = useState('');
  const [codigoReferencia, setCodigoReferencia] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadConfig(),
        loadSolicitudes(),
        loadUsuarios()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { action: 'get_config' }
      });

      if (error) throw error;
      setConfig(data.config);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadSolicitudes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { action: 'get_withdrawal_requests' }
      });

      if (error) throw error;
      setSolicitudes(data.solicitudes || []);
    } catch (error) {
      console.error('Error loading withdrawal requests:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { action: 'get_users' }
      });

      if (error) throw error;
      setUsuarios(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const updateConfig = async () => {
    if (!config) return;

    try {
      const { error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { 
          action: 'update_config',
          ...config
        }
      });

      if (error) throw error;

      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const processSolicitud = async (solicitudId: string, estado: string, notas?: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { 
          action: 'process_withdrawal',
          solicitudId,
          estado,
          notas_admin: notas
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitud procesada",
        description: `La solicitud ha sido ${estado}`,
      });

      loadSolicitudes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTokensToUser = async () => {
    if (!selectedUser || !tokensToAdd || !codigoReferencia) return;

    try {
      const { error } = await supabase.functions.invoke('admin_panel_2025_09_28_19_00', {
        body: { 
          action: 'add_tokens',
          userId: selectedUser.id,
          tokens: parseInt(tokensToAdd),
          codigo_referencia: codigoReferencia
        }
      });

      if (error) throw error;

      toast({
        title: "Tokens agregados",
        description: `Se agregaron ${tokensToAdd} tokens a ${selectedUser.nombre}`,
      });

      setTokensToAdd('');
      setCodigoReferencia('');
      setSelectedUser(null);
      loadUsuarios();
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
      pendiente: 'bg-yellow-500',
      aprobado: 'bg-green-500',
      rechazado: 'bg-red-500',
      procesado: 'bg-blue-500'
    };

    return (
      <Badge className={variants[estado as keyof typeof variants]}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Settings className="w-8 h-8 text-cyan-400 mr-3" />
          <h1 className="text-3xl font-bold neon-text">Panel de Administración</h1>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Configuración Económica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {config && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-white">Valor del Token (Bs)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.token_bs}
                          onChange={(e) => setConfig({...config, token_bs: parseFloat(e.target.value)})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white">Valor del Token (USD)</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={config.token_usd}
                          onChange={(e) => setConfig({...config, token_usd: parseFloat(e.target.value)})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white">Costo del Cartón (tokens)</Label>
                        <Input
                          type="number"
                          value={config.costo_carton}
                          onChange={(e) => setConfig({...config, costo_carton: parseInt(e.target.value)})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white">Porcentaje Premio (%)</Label>
                        <div className="space-y-2">
                          <Slider
                            value={[config.porcentaje_premio]}
                            onValueChange={(value) => setConfig({...config, porcentaje_premio: value[0]})}
                            max={100}
                            min={0}
                            step={5}
                            className="w-full"
                          />
                          <div className="text-center text-cyan-400 font-semibold">
                            {config.porcentaje_premio}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white">Velocidad del Juego (segundos)</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.velocidad_juego]}
                          onValueChange={(value) => setConfig({...config, velocidad_juego: value[0]})}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-center text-cyan-400 font-semibold">
                          {config.velocidad_juego} segundos
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={updateConfig} className="w-full gradient-bg hover:opacity-90">
                      Guardar Configuración
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="solicitudes">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Solicitudes de Retiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">Usuario</TableHead>
                      <TableHead className="text-white">Tokens</TableHead>
                      <TableHead className="text-white">Monto (Bs)</TableHead>
                      <TableHead className="text-white">Estado</TableHead>
                      <TableHead className="text-white">Fecha</TableHead>
                      <TableHead className="text-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitudes.map((solicitud) => (
                      <TableRow key={solicitud.id}>
                        <TableCell className="text-white">
                          <div>
                            <div className="font-semibold">
                              {solicitud.users_2025_09_28_19_00.nombre} {solicitud.users_2025_09_28_19_00.apellido}
                            </div>
                            <div className="text-sm text-gray-400">
                              {solicitud.users_2025_09_28_19_00.email}
                            </div>
                            <div className="text-sm text-gray-400">
                              {solicitud.users_2025_09_28_19_00.banco} - {solicitud.users_2025_09_28_19_00.telefono_pago}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{solicitud.tokens_solicitados}</TableCell>
                        <TableCell className="text-white">{solicitud.monto_bs.toFixed(2)}</TableCell>
                        <TableCell>{getEstadoBadge(solicitud.estado)}</TableCell>
                        <TableCell className="text-white">
                          {new Date(solicitud.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {solicitud.estado === 'pendiente' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => processSolicitud(solicitud.id, 'aprobado')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => processSolicitud(solicitud.id, 'rechazado')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Base de Datos de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">Usuario</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Teléfono</TableHead>
                      <TableHead className="text-white">Tokens</TableHead>
                      <TableHead className="text-white">Datos Bancarios</TableHead>
                      <TableHead className="text-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="text-white">
                          <div className="font-semibold">
                            {usuario.nombre} {usuario.apellido}
                          </div>
                        </TableCell>
                        <TableCell className="text-white">{usuario.email}</TableCell>
                        <TableCell className="text-white">{usuario.telefono}</TableCell>
                        <TableCell className="text-white font-semibold">{usuario.tokens}</TableCell>
                        <TableCell className="text-white">
                          {usuario.banco ? 
                            `${usuario.banco} - ${usuario.telefono_pago}` : 
                            'No configurado'
                          }
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedUser(usuario)}
                                className="gradient-bg hover:opacity-90"
                              >
                                Agregar Tokens
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-card border-white/20">
                              <DialogHeader>
                                <DialogTitle className="text-white">
                                  Agregar Tokens a {selectedUser?.nombre}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-white">Cantidad de Tokens</Label>
                                  <Input
                                    type="number"
                                    value={tokensToAdd}
                                    onChange={(e) => setTokensToAdd(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white"
                                    placeholder="Ej: 100"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-white">Código de Referencia</Label>
                                  <Input
                                    value={codigoReferencia}
                                    onChange={(e) => setCodigoReferencia(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white"
                                    placeholder="Ej: REF123456"
                                  />
                                </div>
                                <Button 
                                  onClick={addTokensToUser}
                                  className="w-full gradient-bg hover:opacity-90"
                                  disabled={!tokensToAdd || !codigoReferencia}
                                >
                                  Agregar Tokens
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estadisticas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Total Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold neon-text">{usuarios.length}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Solicitudes Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400">
                    {solicitudes.filter(s => s.estado === 'pendiente').length}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Tokens en Circulación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">
                    {usuarios.reduce((total, user) => total + user.tokens, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
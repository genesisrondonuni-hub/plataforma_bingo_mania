import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Trophy, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="neon-text">🎱 Bingo</span>
              <br />
              <span className="text-white">Manía</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              La experiencia de bingo más emocionante de Venezuela. 
              Juega, gana tokens y disfruta de premios increíbles.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gradient-bg hover:opacity-90 text-lg px-8 py-4">
                  <Play className="w-5 h-5 mr-2" />
                  Comenzar a Jugar
                </Button>
              </Link>
              <Link to="/admin">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-white/20 text-white hover:bg-white/10">
                  Panel Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glass-card border-white/20 text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Juego Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Partidas dinámicas con velocidad ajustable. 
                Desde 1 hasta 10 segundos por número cantado.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Premios Reales</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Gana tokens que puedes cambiar por dinero real. 
                Sistema de retiro seguro y confiable.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20 text-center">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-400 to-red-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl">Multijugador</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Juega con hasta 50 personas por sala. 
                Chat en tiempo real y clasificaciones.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How to Play Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center text-white mb-12">
          ¿Cómo Jugar?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-400 flex items-center justify-center text-black font-bold text-xl">
              1
            </div>
            <h3 className="text-white font-semibold mb-2">Regístrate</h3>
            <p className="text-gray-300 text-sm">
              Crea tu cuenta y completa tu perfil
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">
              2
            </div>
            <h3 className="text-white font-semibold mb-2">Compra Tokens</h3>
            <p className="text-gray-300 text-sm">
              Recarga tokens para comprar cartones
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-400 flex items-center justify-center text-black font-bold text-xl">
              3
            </div>
            <h3 className="text-white font-semibold mb-2">Únete a Salas</h3>
            <p className="text-gray-300 text-sm">
              Selecciona una sala y compra tu cartón
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold text-xl">
              4
            </div>
            <h3 className="text-white font-semibold mb-2">¡Gana!</h3>
            <p className="text-gray-300 text-sm">
              Completa tu cartón y gana el premio
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 Bingo Manía. La mejor plataforma de bingo online de Venezuela.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
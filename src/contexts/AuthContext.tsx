import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: { nombre: string; apellido: string; telefono?: string }) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          // Crear o actualizar perfil de usuario
          await createOrUpdateUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createOrUpdateUserProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users_2025_09_28_19_00')
        .upsert({
          id: user.id,
          email: user.email!,
          nombre: user.user_metadata?.nombre || user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
          apellido: user.user_metadata?.apellido || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          telefono: user.user_metadata?.telefono || '',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error creating/updating user profile:', error);
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
    }
  };

  const signUp = async (email: string, password: string, userData: { nombre: string; apellido: string; telefono?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: userData
        }
      });

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: "Por favor verifica tu email para completar el registro",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error en el registro",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Inicio de sesión exitoso",
        description: "¡Bienvenido a Bingo Manía!",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Error en el inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) throw new Error('No hay usuario autenticado');

      const { error } = await supabase
        .from('users_2025_09_28_19_00')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado exitosamente",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error al actualizar perfil",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
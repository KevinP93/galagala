import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

type Role = 'admin' | 'player';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;
  private role: Role | null = null;
  private userId: string | null = null;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async signup(email: string, password: string, username: string, phone?: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, phone },
      },
    });

    if (error) {
      console.error('Erreur signup:', error);
      throw new Error(error.message);
    }

    // Si signUp ok, créer un profil avec rôle joueur
    const userId = data.user?.id;
    if (!userId) {
      throw new Error('Impossible de récupérer le compte créé');
    }

    const { error: profileError } = await this.supabase.from('profiles').upsert({
      id: userId,
      username,
      role: 'player',
      email,
      phone: phone ?? null,
    });

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      throw new Error('Le profil joueur n’a pas pu être créé');
    }
  }

  /**
   * LOGIN : email OU username + mot de passe via Supabase Auth
   * Puis récupération du profil + rôle dans la table profiles
   */
  async login(identifier: string, password: string): Promise<Role> {
    const idTrimmed = identifier.trim();
    if (!idTrimmed) {
      throw new Error("Merci d'indiquer un email ou un username");
    }

    // 1. Si username, on récupère l'email correspondant
    let email = idTrimmed.toLowerCase();
    let resolvedRole: Role | null = null;
    let resolvedUserId: string | null = null;

    if (!idTrimmed.includes('@')) {
      const { data: profileByUsername, error: usernameErr } = await this.supabase
        .from('profiles')
        .select('id, email, role')
        .eq('username', idTrimmed)
        .single();

      if (usernameErr || !profileByUsername?.email) {
        throw new Error('Utilisateur introuvable pour ce username');
      }
      email = profileByUsername.email;
      resolvedRole = profileByUsername.role as Role | null;
      resolvedUserId = profileByUsername.id;
    }

    // 2. Tentative de login Supabase
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erreur login:', error);
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Aucun utilisateur trouvé');
    }

    // 3. Stocker le userId
    this.userId = data.user.id;

    // 4. Récupérer le profil pour savoir le rôle (sauf si déjà résolu avec le username)
    if (resolvedRole && resolvedUserId === this.userId) {
      this.role = resolvedRole;
      return this.role;
    }

    const { data: profile, error: profileErr } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('id', this.userId)
      .single();

    if (profileErr) {
      console.error('Erreur récupération profil:', profileErr);
      throw new Error('Impossible de récupérer le profil');
    }

    this.role = profile.role as Role;
    return this.role;
  }

  /**
   * LOGOUT : déconnexion Supabase + reset local
   */
  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.role = null;
    this.userId = null;
  }

  isLoggedIn(): boolean {
    return this.userId !== null && this.role !== null;
  }

  isAdmin(): boolean {
    return this.role === 'admin';
  }

  getRole(): Role | null {
    return this.role;
  }

  getUserId(): string | null {
    return this.userId;
  }
}

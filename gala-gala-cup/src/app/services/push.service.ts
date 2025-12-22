import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { firebaseConfig, firebaseVapidKey } from '../../environments/firebase';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushService {
  private supabase: SupabaseClient;

  constructor(private auth: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async enablePush(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) throw new Error('Connecte-toi avant d’activer les notifications');

    // Safari iOS ne supporte pas FCM web: on évite les erreurs
    const supported = await isSupported();
    if (!supported) throw new Error('Notifications push non supportées sur ce navigateur/appareil');

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // ⚠️ très important: indiquer le SW firebase
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: reg
    });

    if (!token) throw new Error('Token push introuvable (permission refusée ?)');

    // Sauvegarder en DB
    const { error } = await this.supabase.from('notification_tokens').upsert({
      user_id: userId,
      fcm_token: token
    });

    if (error) throw new Error('Impossible d’enregistrer le token push');
  }

  listenForeground(cb: (title: string, body: string) => void) {
    isSupported().then((ok) => {
      if (!ok) return;
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const title = payload?.notification?.title ?? 'GalaGala CUP';
        const body = payload?.notification?.body ?? '';
        cb(title, body);
      });
    });
  }
}

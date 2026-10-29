/**
 * BeShare TV — Client Stalker Portal (Ministra Middleware)
 * Chemin: /supabase/functions/_shared/stalker_client.ts
 * 
 * Gestion de la négociation de session par adresse MAC (Handshake),
 * extraction des genres et des canaux Stalker Portal de manière sécurisée.
 */

import { safeFetch } from './ssrf.ts';
import { sanitizeLogMessage } from './sanitizer.ts';

export interface StalkerCredentials {
  portalUrl: string;
  macAddress: string; // Ex: 00:1A:79:B4:C8:11
}

export interface StalkerGenre {
  id: string;
  title: string;
  alias: string;
}

export interface StalkerChannel {
  id: string;
  name: string;
  number: string;
  cmd: string; // URL de lecture ou commande
  tv_genre_id: string;
  logo: string;
  xmltv_id: string;
}

export class StalkerClient {
  private portalUrl: string;
  private mac: string;
  private token: string | null = null;

  constructor(creds: StalkerCredentials) {
    let cleanUrl = creds.portalUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    // Normalisation de l'URL vers le point d'entrée load.php
    if (!cleanUrl.endsWith('load.php')) {
      cleanUrl = cleanUrl.endsWith('server') ? `${cleanUrl}/load.php` : `${cleanUrl}/server/load.php`;
    }
    this.portalUrl = cleanUrl;
    this.mac = creds.macAddress.trim().toUpperCase();
  }

  private getHeaders(): HeadersInit {
    return {
      'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG250 stbapp ver: 2 rev: 250 Safari/533.3',
      'X-User-Agent': 'Model: MAG250; Link: Ethernet',
      'Cookie': `mac=${encodeURIComponent(this.mac)}; stb_lang=en; timezone=Europe%2FParis${this.token ? `; token=${this.token}` : ''}`,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  /**
   * Handshake initial avec l'adresse MAC pour obtenir le jeton de session
   */
  async handshake(): Promise<string> {
    const url = `${this.portalUrl}?type=stb&action=handshake&token=&mac=${encodeURIComponent(this.mac)}`;

    try {
      const response = await safeFetch(url, {
        headers: this.getHeaders(),
        timeoutMs: 15000,
      });

      if (!response.ok) {
        throw new Error(`Erreur handshake Stalker: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.js || !data.js.token) {
        throw new Error('Échec Handshake Stalker Portal : jeton non reçu ou adresse MAC non autorisée');
      }

      this.token = String(data.js.token);
      return this.token;
    } catch (err: any) {
      throw new Error(`[Stalker Handshake] ${sanitizeLogMessage(err.message)}`);
    }
  }

  /**
   * Récupère les genres (catégories) de chaînes
   */
  async getGenres(): Promise<StalkerGenre[]> {
    if (!this.token) await this.handshake();

    const url = `${this.portalUrl}?type=itv&action=get_genres`;
    const response = await safeFetch(url, {
      headers: this.getHeaders(),
      timeoutMs: 15000,
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.js || [];
  }

  /**
   * Récupère toutes les chaînes autorisées sur le portail
   */
  async getAllChannels(): Promise<StalkerChannel[]> {
    if (!this.token) await this.handshake();

    const url = `${this.portalUrl}?type=itv&action=get_all_channels`;
    const response = await safeFetch(url, {
      headers: this.getHeaders(),
      timeoutMs: 35000,
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.js && data.js.data) ? data.js.data : [];
  }

  /**
   * Résout l'URL de lecture définitive d'une commande de canal
   */
  async createLink(cmd: string): Promise<string> {
    if (!this.token) await this.handshake();

    const url = `${this.portalUrl}?type=itv&action=create_link&cmd=${encodeURIComponent(cmd)}`;
    const response = await safeFetch(url, {
      headers: this.getHeaders(),
      timeoutMs: 15000,
    });

    if (!response.ok) return cmd;
    const data = await response.json();
    if (data.js && data.js.cmd) {
      return data.js.cmd;
    }
    return cmd;
  }
}

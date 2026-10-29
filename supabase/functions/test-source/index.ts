/**
 * BeShare TV — Edge Function de Diagnostic & Test de Source
 * Chemin: /supabase/functions/test-source/index.ts
 * 
 * Permet à l'administrateur de tester une source autorisée en temps réel
 * sans jamais exposer de mot de passe ni risquer une attaque SSRF.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { safeFetch, validateUrlForSSRF } from '../_shared/ssrf.ts';
import { sanitizeLogMessage } from '../_shared/sanitizer.ts';
import { XtreamClient } from '../_shared/xtream_client.ts';
import { StalkerClient } from '../_shared/stalker_client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    // 1. Validation de la clé ou session d'administration
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorisation manquante' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide ou expirée' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Accès réservé aux administrateurs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { type, server_url, username, password, mac_address } = body;

    // 2. Validation SSRF préalable
    const ssrfCheck = validateUrlForSSRF(server_url);
    if (!ssrfCheck.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `[Anti-SSRF] URL refusée : ${ssrfCheck.error}`,
          latencyMs: Math.round(performance.now() - startTime),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Tests par type
    let diagnosticResult: Record<string, any> = {};

    if (type === 'm3u') {
      // Test de l'en-tête M3U avec limitation à 500 Ko
      const response = await safeFetch(server_url, {
        timeoutMs: 12000,
        maxSizeBytes: 500 * 1024,
      });

      if (!response.ok) {
        throw new Error(`Serveur M3U distant inaccessible (HTTP ${response.status})`);
      }

      const textSample = await response.text();
      const hasM3uHeader = textSample.includes('#EXTM3U') || textSample.includes('#EXTINF:');

      if (!hasM3uHeader) {
        throw new Error('Le serveur répond mais le flux ne contient pas d’en-tête M3U valide (#EXTM3U ou #EXTINF)');
      }

      // Estimation rapide du nombre de chaînes dans l'échantillon
      const countSample = (textSample.match(/#EXTINF:/g) || []).length;

      diagnosticResult = {
        protocol: 'M3U / M3U8 Playlist',
        validHeader: true,
        contentType: response.headers.get('content-type') || 'text/plain',
        sampleItemsDetected: countSample,
      };

    } else if (type === 'xtream') {
      if (!username || !password) {
        throw new Error('Nom d’utilisateur et mot de passe requis pour tester Xtream Codes');
      }

      const client = new XtreamClient({
        serverUrl: server_url,
        username,
        password,
      });

      const userInfo = await client.authenticate();

      diagnosticResult = {
        protocol: 'Xtream Codes API v2',
        accountStatus: userInfo.status || 'Active',
        expiryDate: userInfo.exp_date ? new Date(parseInt(userInfo.exp_date, 10) * 1000).toISOString() : 'Illimité',
        activeConnections: userInfo.active_cons || '0',
        maxConnections: userInfo.max_connections || '1',
        serverTimezone: userInfo.server_info?.timezone || 'UTC',
      };

    } else if (type === 'stalker') {
      if (!mac_address) {
        throw new Error('Adresse MAC requise pour tester Stalker Portal');
      }

      const client = new StalkerClient({
        portalUrl: server_url,
        macAddress: mac_address,
      });

      await client.handshake();
      const genres = await client.getGenres();

      diagnosticResult = {
        protocol: 'Stalker Portal (Ministra)',
        handshakeSuccess: true,
        genresFound: genres.length,
      };
    } else {
      throw new Error(`Type de source non pris en charge: ${type}`);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Source testée et validée avec succès.',
        type,
        latencyMs,
        diagnostic: diagnosticResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return new Response(
      JSON.stringify({
        success: false,
        error: sanitizeLogMessage(err.message || 'Erreur lors du test de connexion'),
        latencyMs,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

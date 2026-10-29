/**
 * BeShare TV — Modal d'Ajout & Modification de Source Fournisseur
 * Chemin: /src/components/SourceModal.tsx
 */
import React, { useState, useEffect } from 'react';
import { X, Server, Shield, CheckCircle2, AlertTriangle, RefreshCw, Lock, Radio } from 'lucide-react';
import { Source, SourceType } from '../types';
import { SourceService } from '../services/sourceService';
import { testUrlSSRF } from '../lib/edgeTester';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  sourceToEdit?: Source | null;
  lang: 'fr' | 'ar';
}

export const SourceModal: React.FC<SourceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  sourceToEdit,
  lang,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('m3u');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [syncIntervalHours, setSyncIntervalHours] = useState(24);
  const [isActive, setIsActive] = useState(true);

  // Diagnostic state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs?: number;
  }>({ tested: false, success: false, message: '' });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name);
      setType(sourceToEdit.type);
      setServerUrl(sourceToEdit.server_url);
      setUsername(sourceToEdit.username || '');
      setPassword(sourceToEdit.password || '');
      setMacAddress(sourceToEdit.mac_address || '');
      setEpgUrl(sourceToEdit.epg_url || '');
      setSyncIntervalHours(sourceToEdit.sync_interval_hours || 24);
      setIsActive(sourceToEdit.is_active);
    } else {
      setName('');
      setType('m3u');
      setServerUrl('');
      setUsername('');
      setPassword('');
      setMacAddress('');
      setEpgUrl('');
      setSyncIntervalHours(24);
      setIsActive(true);
    }
    setTestResult({ tested: false, success: false, message: '' });
    setErrorMsg('');
  }, [sourceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!serverUrl) {
      setErrorMsg(lang === 'fr' ? 'Veuillez saisir l’URL du serveur' : 'يرجى إدخال رابط الخادم');
      return;
    }

    setTesting(true);
    setTestResult({ tested: false, success: false, message: '' });

    const res = await SourceService.testSource({
      type,
      server_url: serverUrl,
      username,
      password,
      mac_address: macAddress,
    });

    setTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serverUrl.trim()) {
      setErrorMsg(lang === 'fr' ? 'Le nom et l’URL du serveur sont obligatoires' : 'الاسم ورابط الخادم إجباريان');
      return;
    }

    // SSRF Check avant soumission
    const ssrf = testUrlSSRF(serverUrl);
    if (!ssrf.isSafe) {
      setErrorMsg(`[Anti-SSRF] ${ssrf.blockedReason}`);
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const res = await SourceService.saveSource({
      id: sourceToEdit?.id,
      name: name.trim(),
      type,
      server_url: serverUrl.trim(),
      username: type === 'xtream' ? username.trim() : null,
      password: type === 'xtream' ? password.trim() : null,
      mac_address: type === 'stalker' ? macAddress.trim() : null,
      epg_url: epgUrl.trim() || null,
      sync_interval_hours: syncIntervalHours,
      is_active: isActive,
    });

    setSaving(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de l’enregistrement');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {sourceToEdit
                  ? (lang === 'fr' ? 'Modifier la Source Fournisseur' : 'تعديل المصدر')
                  : (lang === 'fr' ? 'Ajouter une Nouvelle Source' : 'إضافة مصدر جديد')}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'fr' ? 'M3U, Xtream Codes ou Portail Stalker avec protection SSRF' : 'M3U أو Xtream أو Stalker مع حماية SSRF'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Selector (M3U / Xtream / Stalker) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {lang === 'fr' ? 'Protocole de Diffusion' : 'بروتوكول البث'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'm3u', label: 'M3U / M3U8 Playlist', desc: 'Fichier ou URL HLS' },
                { id: 'xtream', label: 'Xtream Codes API', desc: 'Serveur + User + Pass' },
                { id: 'stalker', label: 'Stalker Portal', desc: 'Middleware MAG + MAC' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setType(p.id as SourceType)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    type === p.id
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{p.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Friendly Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {lang === 'fr' ? 'Nom Convivial de la Source' : 'اسم المصدر'}
            </label>
            <input
              type="text"
              required
              placeholder={lang === 'fr' ? 'Ex: Bouquet Premium Sports & Cinéma' : 'مثال: باقة الرياضة والسينما'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Server URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {type === 'm3u'
                  ? (lang === 'fr' ? 'URL de la Liste M3U / M3U8' : 'رابط قائمة M3U')
                  : type === 'xtream'
                  ? (lang === 'fr' ? 'URL du Serveur Xtream (avec port)' : 'رابط خادم Xtream')
                  : (lang === 'fr' ? 'URL du Portail Stalker (ex: http://domain.com/c/)' : 'رابط بوابة Stalker')}
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <Shield className="w-3 h-3" /> Anti-SSRF
              </span>
            </div>
            <input
              type="url"
              required
              placeholder={
                type === 'm3u'
                  ? 'https://example.com/playlist.m3u8'
                  : type === 'xtream'
                  ? 'http://server.iptv.com:8080'
                  : 'http://mag-portal.com/c/'
              }
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Conditional Fields: Xtream */}
          {type === 'xtream' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'fr' ? 'Nom d’utilisateur' : 'اسم المستخدم'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {lang === 'fr' ? 'Mot de passe' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Conditional Fields: Stalker Portal */}
          {type === 'stalker' && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'fr' ? 'Adresse MAC Enregistrée' : 'عنوان MAC المسجل لدى المزود'}
              </label>
              <input
                type="text"
                required
                placeholder="00:1A:79:XX:XX:XX"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
              />
              <span className="text-[10px] text-slate-400">
                {lang === 'fr' ? 'Négociation automatique de session Bearer par Handshake MAC' : 'مصادقة آلية عبر بروتوكول Handshake مع العنوان'}
              </span>
            </div>
          )}

          {/* EPG URL Optional */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{lang === 'fr' ? 'URL Guide des Programmes EPG (XMLTV - Optionnel)' : 'رابط دليل EPG (اختياري)'}</span>
              <span className="text-[10px] text-slate-500 font-mono">XMLTV .xml / .gz</span>
            </label>
            <input
              type="url"
              placeholder="http://epg.example.com/epg.xml.gz"
              value={epgUrl}
              onChange={(e) => setEpgUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-600"
            />
          </div>

          {/* Sync Frequency & Active Switch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'fr' ? 'Fréquence de Synchronisation' : 'دورة المزامنة'}
              </label>
              <select
                value={syncIntervalHours}
                onChange={(e) => setSyncIntervalHours(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value={6}>Toutes les 6 heures</option>
                <option value={12}>Toutes les 12 heures</option>
                <option value={24}>Toutes les 24 heures (Recommandé)</option>
                <option value={48}>Tous les 2 jours</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="text-xs font-semibold text-white">
                  {lang === 'fr' ? 'Source Activée' : 'تفعيل المصدر'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === 'fr' ? 'Accessible pour la synchronisation' : 'متاح للتحديث'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing
                  ? (lang === 'fr' ? 'Diagnostic en cours...' : 'جارٍ الفحص...')
                  : (lang === 'fr' ? 'Tester la Connexion' : 'فحص الاتصال بالمصدر')}
              </button>

              <span className="text-[11px] text-slate-500">
                {lang === 'fr' ? 'Vérifie latence & validité' : 'يفحص سرعة الاستجابة'}
              </span>
            </div>

            {testResult.tested && (
              <div className={`p-3 rounded-xl text-xs border flex items-center justify-between ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.latencyMs !== undefined && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                    {testResult.latencyMs} ms
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              {lang === 'fr' ? 'Annuler' : 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {saving
                ? (lang === 'fr' ? 'Enregistrement...' : 'جارٍ الحفظ...')
                : sourceToEdit
                ? (lang === 'fr' ? 'Mettre à jour' : 'تحديث المصدر')
                : (lang === 'fr' ? 'Enregistrer la Source' : 'حفظ المصدر')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  X, KeyRound, ShieldCheck, CheckCircle2, XCircle, Loader2,
  ExternalLink, Trash2, TestTube2, Save, Eye, EyeOff, PlugZap, Info,
} from 'lucide-react';
import {
  getProviderCatalog, getProviderStatus, saveProviderKey,
  deleteProviderKey, testProviderKey,
} from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
  const [catalog, setCatalog] = useState([]);
  const [status, setStatus] = useState(null);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKeys, setSavedKeys] = useState({});
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState(null); // {type:'ok'|'err', text}

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    Promise.all([getProviderCatalog(), getProviderStatus()])
      .then(([cat, st]) => {
        setCatalog(cat);
        setStatus(st);
        if (cat.length > 0) setProvider(st?.configured ? st.provider : cat[0].id);
        setModel(st?.model || '');
        setBaseUrl(st?.base_url || 'http://localhost:11434');
      })
      .catch((err) => setNotice({ type: 'err', text: err.message }));
  }, [isOpen]);

  useEffect(() => {
    if (!status) return;
    const active = status.configured ? status.provider : null;
    setSavedKeys(active ? { [active]: status } : {});
  }, [status]);

  if (!isOpen) return null;

  const current = catalog.find((p) => p.id === provider);
  const activeSaved = savedKeys[provider];

  const selectProvider = (id) => {
    setProvider(id);
    setNotice(null);
    const p = catalog.find((x) => x.id === id);
    const saved = savedKeys[id];
    if (saved) {
      setModel(saved.model || (p?.default_models?.[0] || ''));
      setBaseUrl(saved.base_url || (p?.requires_base_url ? 'http://localhost:11434' : ''));
    } else {
      setModel(p?.default_models?.[0] || '');
      setBaseUrl(p?.requires_base_url ? 'http://localhost:11434' : '');
      setApiKey('');
    }
  };

  const payload = () => ({
    provider,
    api_key: apiKey.trim() || undefined,
    base_url: current?.requires_base_url && baseUrl.trim() ? baseUrl.trim() : undefined,
    model: model.trim() || undefined,
  });

  const handleTest = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await testProviderKey(payload());
      setNotice({ type: 'ok', text: `Key works! (${res.model})` });
    } catch (err) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await saveProviderKey(payload());
      const st = await getProviderStatus();
      setStatus(st);
      setSavedKeys(st.configured ? { [st.provider]: st } : {});
      setApiKey('');
      setNotice({ type: 'ok', text: `Saved — ${st.label} is now active.` });
      if (onSaved) onSaved(st);
    } catch (err) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove the saved ${current?.label} key?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await deleteProviderKey(provider);
      setSavedKeys({});
      setApiKey('');
      setNotice({ type: 'ok', text: 'Provider key removed.' });
      if (onSaved) onSaved(await getProviderStatus());
    } catch (err) {
      setNotice({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const savedHint = activeSaved
    ? `Saved key ••••${activeSaved.last4 || '???'} — type a new one to replace it.`
    : 'Key is encrypted at rest (Fernet AES). Never shown again after saving.';

  const quotaPct = status ? Math.min(100, Math.round((status.quota_used / status.quota_limit) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <PlugZap className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">AI Provider Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active badge */}
        {status?.configured && (
          <div className="mb-4 flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">Active: {status.label}</span>
            <span className="text-gray-400">
              {status.model}{status.last4 ? ` · ${status.last4}` : ''}
            </span>
          </div>
        )}

        {/* Provider */}
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {catalog.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition ${
                provider === p.id
                  ? 'bg-blue-600/20 border-blue-500/50 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span className="text-sm font-medium">{p.label}</span>
              {savedKeys[p.id] && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            </button>
          ))}
        </div>

        {/* Connector fields */}
        {current?.requires_base_url && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {provider === 'ollama'
                ? 'Works when you run the app on the same machine as Ollama. Not reachable through the hosted site.'
                : 'Ollama Cloud: https://ollama.com'}
            </p>
          </div>
        )}

        {current?.requires_key && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={activeSaved ? '•••••••• (saved key kept)' : 'Paste your API key'}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              <ShieldCheck className="inline w-3 h-3 mr-0.5 text-emerald-400" /> {savedHint}
            </p>
            {current?.docs_url && (
              <a
                href={current.docs_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1"
              >
                <ExternalLink className="w-3 h-3" /> Get a {current.label} key
              </a>
            )}
          </div>
        )}

        {/* Model */}
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Model</label>
        <input
          type="text"
          list="model-options"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gemini-2.5-flash"
          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <datalist id="model-options">
          {current?.default_models?.map((m) => <option key={m} value={m} />)}
        </datalist>
        <p className="text-[11px] text-gray-500 mt-1">
          <Info className="inline w-3 h-3 mr-0.5" /> You can type any model name, or pick a suggested one.
        </p>

        {/* Notice */}
        {notice && (
          <div className={`mt-3 flex items-start space-x-2 text-xs px-3 py-2.5 rounded-lg border ${
            notice.type === 'ok'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
          }`}>
            {notice.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Quota */}
        {status?.require_provider && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Today's usage</span>
              <span>{status.quota_used}/{status.quota_limit} analyses</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${quotaPct >= 90 ? 'bg-red-500' : quotaPct >= 60 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
        </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-gray-800 pt-4">
          <div className="flex space-x-2">
            {activeSaved && (
              <button
                onClick={handleRemove}
                disabled={busy}
                className="flex items-center space-x-1.5 text-xs px-3 py-2 rounded-lg bg-gray-800/60 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleTest}
              disabled={testing || busy || !current?.requires_key}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700/60 text-gray-200 border border-gray-700 transition disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
              <span>Test</span>
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center space-x-1.5 text-xs px-4 py-2 rounded-lg gradient-btn text-white font-semibold transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save & Use</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
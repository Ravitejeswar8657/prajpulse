import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Sparkles, ExternalLink } from "lucide-react";

/*
  PRAJA PULSE — Modernized Frontend (TypeScript + Tailwind + Gemini Backend)
*/

const API_BASE =
  (typeof window !== "undefined" && (window as any).PRAJA_API_BASE) || "http://127.0.0.1:8000";

interface Entity {
  id: string;
  label: string;
  party: string;
  net: number;
  n: number;
}

interface SignalEntity {
  id: string;
  label?: string;
  sentiment: number;
}

interface Signal {
  text: string;
  link: string;
  source: string;
  published: string;
  issue: string;
  entities: SignalEntity[];
  method: "lexicon" | "deep";
}

interface PulseData {
  board: Entity[];
  issues: [string, number][];
  signals: Signal[];
  updated_at: string | null;
  deep_available: boolean;
}

const PARTY_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  TDP:   { color: "#F5C518", bg: "bg-[#F5C518]", text: "text-[#1a1400]" },
  JSP:   { color: "#E2231A", bg: "bg-[#E2231A]", text: "text-white" },
  YSRCP: { color: "#1E63C4", bg: "bg-[#1E63C4]", text: "text-white" },
};

const getToneColor = (v: number) => (v > 0.15 ? "text-green-500" : v < -0.15 ? "text-red-500" : "text-yellow-600");
const getAvatar = (label: string) => label.split(" ").map((w) => w[0]).slice(0, 2).join("");

export default function PrajaPulse() {
  const [data, setData] = useState<PulseData>({
    board: [],
    issues: [],
    signals: [],
    updated_at: null,
    deep_available: false
  });
  const [loading, setLoading] = useState(false);
  const [deepBusy, setDeepBusy] = useState(false);
  const [note, setNote] = useState("Connecting to backend…");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/pulse?limit=60`);
      if (!r.ok) throw new Error("pulse fetch failed");
      const d: PulseData = await r.json();
      setData(d);
      setNote(d.signals.length 
        ? `${d.signals.length} signals · updated ${new Date(d.updated_at!).toLocaleString()}` 
        : "Backend reachable but no signals yet.");
    } catch (e) {
      setNote(`Cannot reach backend at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runDeep() {
    setDeepBusy(true);
    try {
      const texts = data.signals.map((s) => s.text);
      const r = await fetch(`${API_BASE}/api/deep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      if (!r.ok) throw new Error("deep unavailable");
      const { results } = await r.json();
      
      const byText = Object.fromEntries(results.map((res: any) => [res.text, res]));
      
      setData((prev) => ({
        ...prev,
        signals: prev.signals.map((s) => {
          const deepRes = byText[s.text];
          if (!deepRes) return s;
          return {
            ...s,
            method: "deep",
            entities: deepRes.entities.map((e: any) => ({
              ...e,
              label: prev.board.find((b) => b.id === e.id)?.label || e.id
            }))
          };
        }),
      }));
      setNote("Deep re-score applied via Gemini.");
    } catch (e) {
      setNote("Deep scoring failed (check GEMINI_API_KEY).");
    } finally {
      setDeepBusy(false);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 pb-10 font-archivo">
      {/* Visual Banner */}
      <div className="flex h-2 -mx-6">
        <div className="flex-1 bg-[#F5C518]" />
        <div className="flex-1 bg-[#E2231A]" />
        <div className="flex-1 bg-[#1E63C4]" />
      </div>

      <header className="flex flex-wrap items-center gap-4 py-6">
        <div>
          <h1 className="font-telugu font-black text-4xl uppercase leading-none">
            ప్రజా<span className="font-anton ml-2 text-[#F5C518] [text-shadow:2px_2px_0_#000]">PULSE</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold tracking-wider uppercase mt-1">
            ఆంధ్రప్రదేశ్ · public sentiment radar · Telugu-aware
          </p>
        </div>
        <div className="ml-auto flex gap-3">
          <button 
            onClick={load} 
            disabled={loading}
            className="flex items-center gap-2 bg-[#F5C518] text-black border-2 border-black shadow-[4px_4px_0_#F5C518] font-anton text-sm tracking-widest px-5 py-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#F5C518] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
          {data.deep_available && (
            <button 
              onClick={runDeep} 
              disabled={deepBusy}
              className="flex items-center gap-2 bg-white text-black border-2 border-black shadow-[4px_4px_0_#E2231A] font-anton text-sm tracking-widest px-5 py-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#E2231A] transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${deepBusy ? 'animate-pulse' : ''}`} />
              DEEP
            </button>
          )}
        </div>
      </header>

      {note && (
        <div className="bg-[#1d1d1d] border-l-4 border-[#F5C518] px-4 py-2 text-xs text-gray-300 mb-6 font-semibold">
          {note}
        </div>
      )}

      {/* Leaderboard */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-10">
        {data.board.map((e, i) => {
          const config = PARTY_CONFIG[e.party] || { color: "#888", bg: "bg-gray-500", text: "text-white" };
          return (
            <div key={e.id} className="bg-[#141414] border-2 border-black p-4 relative shadow-[6px_6px_0_var(--shadow-color)]" style={{ "--shadow-color": config.color } as any}>
              <div className="absolute top-2 right-3 font-anton text-xl" style={{ color: config.color }}>#{i + 1}</div>
              <div className={`w-12 h-12 ${config.bg} ${config.text} font-anton text-lg flex items-center justify-center border-2 border-black mb-3`}>
                {getAvatar(e.label)}
              </div>
              <div className="font-extrabold text-sm leading-tight">{e.label}</div>
              <div className={`text-[10px] font-black tracking-widest uppercase mb-2`} style={{ color: config.color }}>{e.party}</div>
              <div className={`font-anton text-3xl leading-none ${getToneColor(e.net)}`}>
                {e.net > 0 ? "+" : ""}{e.net.toFixed(2)}
              </div>
              <div className="h-2 bg-black relative my-2 overflow-hidden">
                <span 
                  className="absolute top-0 h-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.abs(e.net) * 50}%`, 
                    left: `${e.net >= 0 ? 50 : 50 - Math.abs(e.net) * 50}%`,
                    backgroundColor: e.net > 0 ? '#22c55e' : e.net < 0 ? '#ef4444' : '#ca8a04'
                  }} 
                />
              </div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{e.n} signals</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] gap-8">
        <section>
          <h2 className="font-anton text-xl tracking-widest uppercase mb-4">Live Signals</h2>
          <div className="space-y-3">
            {data.signals.map((r, i) => (
              <a 
                key={i} 
                href={r.link} 
                target="_blank" 
                rel="noreferrer"
                className="block bg-[#141414] border border-black border-l-4 border-l-[#F5C518] p-4 hover:border-l-white transition-all group"
              >
                <p className="text-sm font-semibold leading-relaxed mb-3 flex items-start gap-2">
                  {r.text}
                  {r.method === "deep" && <span className="text-[#E2231A] text-[10px] font-black uppercase flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> deep</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {r.entities.map((e, j) => {
                    const party = data.board.find(b => b.id === e.id)?.party;
                    const config = PARTY_CONFIG[party || ""] || { bg: "bg-gray-600", text: "text-white" };
                    return (
                      <span key={j} className={`font-anton text-[10px] tracking-wider px-2 py-0.5 border-2 border-black ${config.bg} ${config.text}`}>
                        {e.label?.split(" ").pop()} {e.sentiment > 0 ? "+" : ""}{e.sentiment.toFixed(1)}
                      </span>
                    );
                  })}
                  <span className="text-[10px] font-black uppercase bg-gray-700 px-2 py-0.5">{r.issue}</span>
                  <span className="text-[10px] text-gray-500 font-bold ml-auto flex items-center gap-1 group-hover:text-white transition-colors">
                    {r.source} <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="font-anton text-xl tracking-widest uppercase mb-4 border-b-4 border-b-[#E2231A] pb-1">Hot Issues</h2>
          <div className="divide-y divide-gray-800">
            {data.issues.map(([name, n]) => (
              <div key={name} className="flex justify-between items-center py-3">
                <span className="text-sm font-bold text-gray-300">{name}</span>
                <span className="font-anton text-xl text-[#F5C518]">{n}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-dashed border-gray-800 text-[10px] leading-relaxed text-gray-500 font-semibold">
            Public-data signals only · sentiment via open Telugu/Tenglish lexicon + Google Gemini AI · no PII · headlines link to source.
          </div>
        </aside>
      </div>
    </div>
  );
}

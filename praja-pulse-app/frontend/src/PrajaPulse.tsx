import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Sparkles, ExternalLink, Maximize, Info, X, ChevronLeft, ChevronRight, FilterX, MapPin, Users } from "lucide-react";

/*
  PRAJA PULSE — Modernized Frontend (Enhanced Edition)
*/

const API_BASE =
  (typeof window !== "undefined" && (window as any).PRAJA_API_BASE) || "http://127.0.0.1:8000";

const SIGNALS_PER_PAGE = 10;

interface District {
  id: string;
  label: string;
  net: number;
  n: number;
}

interface Representative {
  name: string;
  party: string;
  constituency: string;
}

interface RepData {
  mps: Representative[];
  mlas: Representative[];
}

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
  districts: District[];
  updated_at: string | null;
  deep_available: boolean;
}

const DISTRICT_GRID: Record<string, { r: number; c: number }> = {
  "manyam": { r: 0, c: 7 },
  "srikakulam": { r: 0, c: 8 },
  "vizianagaram": { r: 1, c: 7 },
  "asr": { r: 1, c: 6 },
  "visakhapatnam": { r: 2, c: 7 },
  "anakapalli": { r: 2, c: 6 },
  "kakinada": { r: 2, c: 5 },
  "east_godavari": { r: 3, c: 6 },
  "konaseema": { r: 3, c: 5 },
  "west_godavari": { r: 4, c: 5 },
  "eluru": { r: 4, c: 4 },
  "ntr": { r: 5, c: 4 },
  "krishna": { r: 5, c: 5 },
  "guntur": { r: 6, c: 4 },
  "bapatla": { r: 6, c: 5 },
  "palnadu": { r: 6, c: 3 },
  "prakasam": { r: 7, c: 4 },
  "nellore": { r: 8, c: 4 },
  "kurnool": { r: 6, c: 1 },
  "nandyal": { r: 7, c: 2 },
  "kadapa": { r: 8, c: 2 },
  "anantapur": { r: 7, c: 0 },
  "sathya_sai": { r: 8, c: 0 },
  "annamayya": { r: 9, c: 1 },
  "tirupati": { r: 9, c: 3 },
  "chittoor": { r: 10, c: 2 },
};

const PARTY_CONFIG: Record<string, { color: string; bg: string; text: string; fullName: string; logo: string }> = {
  TDP:   { color: "#F5C518", bg: "bg-[#F5C518]", text: "text-[#1a1400]", fullName: "Telugu Desam Party", logo: "/assets/parties/Telugu_Desam_Party_Flag.png" },
  JSP:   { color: "#E2231A", bg: "bg-[#E2231A]", text: "text-white", fullName: "Jana Sena Party", logo: "/assets/parties/jsplogo.jpg" },
  YSRCP: { color: "#1E63C4", bg: "bg-[#1E63C4]", text: "text-white", fullName: "Yuvajana Sramika Rythu Congress Party", logo: "/assets/parties/YSRCPLOGO.jpg" },
};

const LEADER_PHOTOS: Record<string, string> = {
  naidu: "/assets/leaders/naidu.jpg",
  lokesh: "/assets/leaders/lokesh.jpg",
  pawan: "/assets/leaders/pawan.jpg",
  jagan: "/assets/leaders/jagan.jpg",
  tdp: "/assets/parties/Telugu_Desam_Party_Flag.png",
  jsp: "/assets/parties/jsplogo.jpg",
  ysrcp: "/assets/parties/YSRCPLOGO.jpg",
};

const getToneColor = (v: number) => (v > 0.15 ? "text-green-500" : v < -0.15 ? "text-red-500" : "text-yellow-600");

export default function PrajaPulse() {
  const [data, setData] = useState<PulseData>({
    board: [],
    issues: [],
    signals: [],
    districts: [],
    updated_at: null,
    deep_available: false
  });
  const [loading, setLoading] = useState(false);
  const [deepBusy, setDeepBusy] = useState(false);
  const [note, setNote] = useState("Connecting to backend…");
  
  // New Enhancement State
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [reps, setReps] = useState<RepData | null>(null);
  const [repsLoading, setRepsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/pulse?limit=100`);
      if (!r.ok) throw new Error("pulse fetch failed");
      const d: PulseData = await r.json();
      
      // Sort signals by published date, newest first
      const sortedSignals = d.signals.sort((a, b) => {
        const dateA = new Date(a.published).getTime();
        const dateB = new Date(b.published).getTime();
        return dateB - dateA;
      });

      setData({ ...d, signals: sortedSignals });
      setNote(d.signals.length 
        ? `${d.signals.length} signals · updated ${new Date(d.updated_at!).toLocaleString()}` 
        : "Backend reachable but no signals yet.");
    } catch (e) {
      setNote(`Cannot reach backend at ${API_BASE}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReps = async (districtId: string) => {
    setRepsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/representatives/${districtId}`);
      if (!r.ok) throw new Error("reps fetch failed");
      const d = await r.json();
      setReps(d);
    } catch (e) {
      console.error(e);
    } finally {
      setRepsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDistrict) loadReps(selectedDistrict.id);
    else setReps(null);
  }, [selectedDistrict]);

  useEffect(() => { load(); }, [load]);

  const filteredSignals = useMemo(() => {
    if (!selectedEntityId) return data.signals;
    return data.signals.filter(s => s.entities.some(e => e.id === selectedEntityId));
  }, [data.signals, selectedEntityId]);

  const paginatedSignals = useMemo(() => {
    const start = (currentPage - 1) * SIGNALS_PER_PAGE;
    return filteredSignals.slice(start, start + SIGNALS_PER_PAGE);
  }, [filteredSignals, currentPage]);

  const totalPages = Math.ceil(filteredSignals.length / SIGNALS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEntityId]);

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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="mx-auto px-6 pb-10 font-archivo">
      {/* Visual Banner */}
      <div className="flex h-2 -mx-6">
        <div className="flex-1 bg-[#F5C518]" />
        <div className="flex-1 bg-[#E2231A]" />
        <div className="flex-1 bg-[#1E63C4]" />
      </div>

      <header className="flex flex-wrap items-center gap-4 py-6">
        <div className="cursor-pointer" onClick={() => setSelectedEntityId(null)}>
          <h1 className="font-telugu font-black text-4xl uppercase leading-none">
            ప్రజా<span className="font-anton ml-2 text-[#F5C518] [text-shadow:2px_2px_0_#000]">PULSE</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold tracking-wider uppercase mt-1">
            ఆంధ్రప్రదేశ్ · public sentiment radar · Telugu-aware
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 bg-gray-800 text-white border-2 border-black shadow-[4px_4px_0_#444] font-anton text-sm tracking-widest px-4 py-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#444] transition-all"
          >
            <Info className="w-4 h-4" />
            ABOUT
          </button>
          <button 
            onClick={toggleFullScreen}
            className="flex items-center gap-2 bg-gray-800 text-white border-2 border-black shadow-[4px_4px_0_#444] font-anton text-sm tracking-widest px-4 py-2 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#444] transition-all"
          >
            <Maximize className="w-4 h-4" />
            FULL
          </button>
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-anton text-xl tracking-widest uppercase">Leaderboard</h2>
        {selectedEntityId && (
          <button 
            onClick={() => setSelectedEntityId(null)}
            className="flex items-center gap-2 text-xs font-black uppercase text-[#F5C518] border border-[#F5C518] px-3 py-1 hover:bg-[#F5C518] hover:text-black transition-all"
          >
            <FilterX className="w-3 h-3" /> Clear Filter
          </button>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8 mb-12">
        {data.board.map((e, i) => {
          const config = PARTY_CONFIG[e.party] || { color: "#888", bg: "bg-gray-500", text: "text-white", fullName: e.party, logo: "" };
          const isSelected = selectedEntityId === e.id;
          return (
            <div 
              key={e.id} 
              onClick={() => setSelectedEntityId(e.id)}
              className={`group bg-[#1a1a1a] border-2 cursor-pointer transition-all duration-500 ease-out ${isSelected ? 'border-white ring-8 ring-white/5 scale-[1.03] z-10' : 'border-black opacity-95 hover:opacity-100 hover:border-gray-600 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]'} overflow-hidden relative shadow-[10px_10px_0_var(--shadow-color)]`} 
              style={{ "--shadow-color": config.color } as any}
            >
              {/* Party Strip */}
              <div className={`h-2 ${config.bg}`} />
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 overflow-hidden border-2 border-black bg-gray-900 shadow-[6px_6px_0_#000] group-hover:shadow-[8px_8px_0_#000] transition-all">
                      <img src={LEADER_PHOTOS[e.id] || config.logo} alt={e.label} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" />
                    </div>
                    <div className={`absolute -bottom-3 -right-3 w-10 h-10 border-2 border-black ${config.bg} flex items-center justify-center shadow-[3px_3px_0_#000] transform group-hover:rotate-12 transition-transform`}>
                       <span className={`font-anton text-sm ${config.text}`}>#{i + 1}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-anton text-5xl leading-none mb-1 drop-shadow-md ${getToneColor(e.net)}`}>
                      {e.net > 0 ? "+" : ""}{e.net.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Net Pulse</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-anton text-2xl leading-tight uppercase tracking-tight group-hover:text-[#F5C518] transition-colors">{e.label}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="w-6 h-6 border border-black shadow-[2px_2px_0_#000] overflow-hidden bg-white">
                      <img src={config.logo} alt={e.party} className="w-full h-full object-contain" />
                    </div>
                    <span className={`text-[11px] font-black px-2 py-0.5 border border-black ${config.bg} ${config.text} uppercase`}>
                      {e.party}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[180px]">
                      {config.fullName}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-4 bg-black/60 relative overflow-hidden border border-gray-800 rounded-sm">
                    <div 
                      className="absolute top-0 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                      style={{ 
                        width: `${Math.abs(e.net) * 50}%`, 
                        left: `${e.net >= 0 ? 50 : 50 - Math.abs(e.net) * 50}%`,
                        backgroundColor: e.net > 0 ? '#22c55e' : e.net < 0 ? '#ef4444' : '#ca8a04'
                      }} 
                    />
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/40 -translate-x-1/2" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-[11px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${e.net > 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      {e.n} Signal Count
                    </div>
                    <button 
                      onClick={(evt) => {
                        evt.stopPropagation();
                        setSelectedEntityId(isSelected ? null : e.id);
                      }}
                      className="text-[10px] text-[#F5C518] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1 group/btn"
                    >
                      {isSelected ? "Showing All" : "View Details"} <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regional Radar (District Heatmap) */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-anton text-xl tracking-widest uppercase flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#E2231A]" />
          Regional Radar
        </h2>
        <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-4">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /> Positive</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Negative</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-600 rounded-full" /> Neutral / No Data</div>
        </div>
      </div>

      <div className="bg-[#141414] border-2 border-black p-8 mb-12 relative overflow-hidden group/map shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(#F5C518_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="relative grid grid-cols-9 gap-2 md:gap-4 max-w-4xl mx-auto">
          {data.districts.map((dist) => {
            const grid = DISTRICT_GRID[dist.id] || { r: 0, c: 0 };
            const sentimentColor = dist.n === 0 ? 'bg-gray-800' : dist.net > 0.1 ? 'bg-green-500/80' : dist.net < -0.1 ? 'bg-red-500/80' : 'bg-yellow-500/80';
            const glowColor = dist.n === 0 ? '' : dist.net > 0.1 ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' : dist.net < -0.1 ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'shadow-[0_0_15px_rgba(234,179,8,0.4)]';
            
            return (
              <div 
                key={dist.id}
                onClick={() => setSelectedDistrict(dist)}
                style={{ gridRow: grid.r + 1, gridColumn: grid.c + 1 }}
                className={`aspect-square cursor-pointer transition-all duration-300 transform hover:scale-110 hover:z-20 border border-black/40 group/tile relative ${sentimentColor} ${glowColor}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="font-anton text-[8px] md:text-[10px] uppercase text-black leading-none text-center px-1 drop-shadow-sm">{dist.label.split(" ").pop()}</span>
                </div>
                {/* Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black border border-[#F5C518] p-2 pointer-events-none opacity-0 group-hover/tile:opacity-100 transition-opacity z-50 shadow-xl">
                  <div className="text-[10px] font-black uppercase text-[#F5C518] mb-1">{dist.label}</div>
                  <div className="flex justify-between text-[9px] font-bold text-white uppercase">
                    <span>Pulse: {dist.net > 0 ? "+" : ""}{dist.net}</span>
                    <span>{dist.n} Sig</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
          Interactive Sentiment Heatmap · Click District for Representatives
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr] gap-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-anton text-xl tracking-widest uppercase">
              {selectedEntityId ? `Signals for ${data.board.find(b => b.id === selectedEntityId)?.label}` : "Live Signals"}
            </h2>
            <div className="text-[10px] font-black text-gray-500 uppercase">
              Page {currentPage} of {totalPages || 1} ({filteredSignals.length} results)
            </div>
          </div>
          
          <div className="space-y-3 min-h-[600px]">
            {paginatedSignals.length > 0 ? paginatedSignals.map((r, i) => (
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
                    {new Date(r.published).toLocaleDateString()} · {r.source} <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            )) : (
              <div className="bg-[#141414] border-2 border-dashed border-gray-800 p-10 text-center text-gray-500 font-bold uppercase tracking-widest">
                No signals found for this filter.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border-2 border-black bg-[#141414] shadow-[4px_4px_0_#000] disabled:opacity-30 hover:bg-gray-800 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 border-2 border-black font-anton flex items-center justify-center transition-all ${currentPage === i + 1 ? 'bg-[#F5C518] text-black shadow-[4px_4px_0_#000]' : 'bg-[#141414] text-white hover:bg-gray-800'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border-2 border-black bg-[#141414] shadow-[4px_4px_0_#000] disabled:opacity-30 hover:bg-gray-800 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
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

      {/* District Representative Modal */}
      {selectedDistrict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="relative bg-[#0a0a0a] border-4 border-black shadow-[30px_30px_0_#F5C518] max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedDistrict(null)}
              className="absolute top-4 right-4 p-2 hover:bg-red-500 hover:text-white border-2 border-black transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-4 mb-8 border-b-8 border-b-[#E2231A] pb-4">
              <div className={`w-16 h-16 flex items-center justify-center border-4 border-black bg-[#F5C518] text-black font-anton text-2xl shadow-[4px_4px_0_#000]`}>
                {selectedDistrict.label.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-anton text-5xl tracking-tighter uppercase">{selectedDistrict.label}</h2>
                <div className="flex items-center gap-4 text-xs font-black uppercase text-gray-500 tracking-widest mt-1">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> District Intelligence</span>
                  <span className="flex items-center gap-1 text-[#F5C518]">Pulse: {selectedDistrict.net > 0 ? "+" : ""}{selectedDistrict.net}</span>
                </div>
              </div>
            </div>

            {repsLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto text-[#F5C518] mb-4" />
                <div className="font-anton text-xl uppercase tracking-widest">Loading Representative Data...</div>
              </div>
            ) : reps ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <section>
                  <h3 className="font-anton text-2xl tracking-widest text-[#F5C518] mb-6 uppercase flex items-center gap-2 border-b-2 border-dashed border-gray-800 pb-2">
                    <Users className="w-5 h-5" /> Members of Parliament
                  </h3>
                  <div className="space-y-4">
                    {reps.mps.length > 0 ? reps.mps.map((m, idx) => (
                      <div key={idx} className="bg-[#141414] border-l-4 border-l-[#F5C518] p-4 shadow-[4px_4px_0_#000]">
                        <div className="text-lg font-black text-white leading-none">{m.name}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-widest">
                          {m.constituency} · {m.party}
                        </div>
                      </div>
                    )) : <div className="text-gray-600 font-bold italic">No Lok Sabha data available for this segment.</div>}
                  </div>
                </section>

                <section>
                  <h3 className="font-anton text-2xl tracking-widest text-[#E2231A] mb-6 uppercase flex items-center gap-2 border-b-2 border-dashed border-gray-800 pb-2">
                    <Users className="w-5 h-5" /> Legislative Assembly
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {reps.mlas.length > 0 ? reps.mlas.map((m, idx) => (
                      <div key={idx} className="bg-[#141414] border border-gray-900 p-3 hover:border-[#F5C518] transition-colors group">
                        <div className="flex justify-between items-center">
                          <div className="font-extrabold text-white text-sm group-hover:text-[#F5C518] transition-colors">{m.name}</div>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 border border-black ${PARTY_CONFIG[m.party]?.bg || 'bg-gray-700'} ${PARTY_CONFIG[m.party]?.text || 'text-white'}`}>
                            {m.party}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase mt-1">{m.constituency} Constituency</div>
                      </div>
                    )) : <div className="text-gray-600 font-bold italic">No Assembly data available.</div>}
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-600 font-bold uppercase tracking-widest">
                No verified data found for this region.
              </div>
            )}

            <div className="mt-12 pt-6 border-t border-gray-800 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-gray-600">Official Election Commission Data 2024–2029</span>
              <button 
                onClick={() => setSelectedDistrict(null)}
                className="bg-white text-black font-anton text-sm tracking-widest px-8 py-3 border-2 border-black hover:bg-[#F5C518] transition-all active:translate-x-1 active:translate-y-1"
              >
                CLOSE INTELLIGENCE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="relative bg-[#141414] border-4 border-black shadow-[20px_20px_0_#F5C518] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-anton text-4xl tracking-tighter uppercase mb-6 border-b-8 border-b-[#E2231A] inline-block">ABOUT PRAJA PULSE</h2>
            <div className="space-y-6 text-gray-300 font-archivo leading-relaxed">
              <p className="text-xl font-extrabold text-white">
                Praja Pulse is a real-time political sentiment radar for Andhra Pradesh.
              </p>
              <div>
                <h3 className="font-anton tracking-widest text-[#F5C518] mb-2 uppercase">How it works</h3>
                <p>
                  Our system aggregates headlines from major news outlets via RSS. It then processes the text using a custom-built, AP-specific lexicon that understands English, Telugu script, and Tenglish.
                </p>
              </div>
              <div>
                <h3 className="font-anton tracking-widest text-[#F5C518] mb-2 uppercase">Gemini AI Integration</h3>
                <p>
                  For complex cases involving multi-entity mentions or sarcasm, we leverage Google Gemini 1.5 Flash to provide a "Deep" score, ensuring the radar stays sharp and accurate.
                </p>
              </div>
              <div>
                <h3 className="font-anton tracking-widest text-[#F5C518] mb-2 uppercase">The Moat</h3>
                <p>
                  The core of Praja Pulse is its ground-truth lexicon and entity mapping, maintained by political analysts to reflect the unique linguistic and political landscape of AP.
                </p>
              </div>
              <div className="pt-6 border-t border-gray-800 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-500">v2.0 Modernized · Powered by Google AI</span>
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="bg-white text-black font-anton text-sm tracking-widest px-6 py-2 border-2 border-black"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

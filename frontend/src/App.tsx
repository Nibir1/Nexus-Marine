import { useState } from 'react';
import axios from 'axios';

// Load API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [log, setLog] = useState<string[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const sendTelemetry = async (status: 'NORMAL' | 'CRITICAL') => {
    if (!API_URL) { addLog("❌ Error: API_URL missing"); return; }

    const payload = {
      shipId: "SHIP-FE-001",
      timestamp: new Date().toISOString(),
      temperature: status === 'CRITICAL' ? 105 : 85,
      fuelLevel: 60,
      latitude: 60.1,
      longitude: 24.9,
      status: status
    };

    try {
      addLog(`📡 Sending ${status} Telemetry...`);
      await axios.post(`${API_URL}/telemetry`, payload);
      addLog(`✅ Telemetry Sent! ${status === 'CRITICAL' ? '⚠️ Alert Triggered!' : ''}`);
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL) { addLog("❌ Error: API_URL missing"); return; }
    setLoadingOrder(true);

    const payload = {
      shipId: "SHIP-FE-001",
      partId: "PISTON-RING-X2",
      quantity: 5
    };

    try {
      addLog(`📦 Placing Order for ${payload.partId}...`);
      await axios.post(`${API_URL}/orders`, payload);
      addLog(`✅ Order Placed successfully! (Syncing to Salesforce in background)`);
    } catch (err: any) {
      addLog(`❌ Order Failed: ${err.message}`);
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    // Main Container with subtle glowing top border effect
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950">
      
      <header className="mb-12 text-center pb-6 border-b border-slate-800/50">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 filter drop-shadow-lg">
          Nexus Marine
        </h1>
        <p className="text-slate-400 mt-3 text-lg tracking-wider uppercase">Fleet Command & Logistics Portal</p>
        <div className="mt-4 inline-block px-4 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-cyan-600/70">
          API Target: {API_URL ? 'Connected' : 'Not Configured'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- CARD 1: TELEMETRY --- */}
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl transition-all hover:shadow-cyan-900/20 hover:shadow-2xl">
          <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-2xl h-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
              <span className="text-cyan-400 text-3xl">📡</span> Ship Telemetry
            </h2>
            <p className="text-slate-400 mb-8 text-sm">Simulate sensor readings from vessel "SHIP-FE-001".</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => sendTelemetry('NORMAL')}
                className="flex-1 cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold shadow-lg transform transition hover:-translate-y-1 active:translate-y-0 border border-emerald-500/20"
              >
                Normal (85°C)
              </button>
              <button 
                onClick={() => sendTelemetry('CRITICAL')}
                className="flex-1 cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold shadow-lg transform transition hover:-translate-y-1 active:translate-y-0 border border-red-500/20 relative overflow-hidden"
              >
                <span className="relative z-10">Critical (105°C)</span>
                 {/* Subtle pulse animation for critical button */}
                <span className="absolute inset-0 bg-red-400/20 animate-pulse z-0"></span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800">
              ℹ️ Critical status triggers EventBridge ⇒ SQS Alert.
            </p>
          </div>
        </div>

        {/* --- CARD 2: ORDERS --- */}
        <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl transition-all hover:shadow-blue-900/20 hover:shadow-2xl">
           <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-2xl h-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
              <span className="text-blue-400 text-3xl">📦</span> Quick Order
            </h2>
            <p className="text-slate-400 mb-6 text-sm">Place an urgent restock order.</p>

            <form onSubmit={placeOrder} className="space-y-6">
              <div className="bg-black/40 p-4 rounded-lg border border-slate-800/60 font-mono text-sm text-cyan-300/80">
                <div className="flex justify-between mb-2"><span>Part SKU:</span> <span className="text-white">PISTON-RING-X2</span></div>
                <div className="flex justify-between"><span>Quantity:</span> <span className="text-white">5 Units</span></div>
              </div>
              <button 
                type="submit"
                disabled={loadingOrder}
                className={`w-full cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold shadow-lg transform transition hover:-translate-y-1 active:translate-y-0 border border-blue-500/20 flex justify-center items-center ${loadingOrder ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loadingOrder ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                ) : 'Place Order Now'}
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-800">
              ℹ️ Triggers Postgres Write + Async Salesforce Sync.
            </p>
          </div>
        </div>

      </div>

      {/* CONSOLE LOGS */}
      <div className="mt-12">
        <h3 className="text-lg font-bold mb-4 text-slate-300 flex items-center">
          <span className="inline-block w-2 h-2 bg-cyan-500 rounded-full mr-2 animate-pulse"></span>
          Live System Interface
        </h3>
        <div className="bg-black/80 p-4 rounded-xl font-mono text-xs md:text-sm h-64 overflow-y-auto border border-slate-800/60 shadow-inner custom-scrollbar">
          {log.length === 0 && <span className="text-slate-600 italic">Waiting for subsystem interaction...</span>}
          {log.map((entry, i) => {
             // Colorize logs based on content
             let colorClass = "text-slate-300";
             if(entry.includes("✅")) colorClass = "text-emerald-400";
             if(entry.includes("❌")) colorClass = "text-red-400";
             if(entry.includes("📡") || entry.includes("📦")) colorClass = "text-cyan-300";
             
             return <div key={i} className={`mb-1.5 border-b border-slate-900/50 pb-1 ${colorClass}`}>{entry}</div>
          })}
        </div>
      </div>
    </div>
  );
}

// Add custom scrollbar styling for the log window
const customStyles = document.createElement('style');
customStyles.innerHTML = `
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
`;
document.head.appendChild(customStyles);

export default App;
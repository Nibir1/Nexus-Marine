import { useState } from 'react';
import axios from 'axios';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css'; // Default Login Styling

// 1. Configure Amplify with your Env Vars
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    }
  }
});

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [log, setLog] = useState<string[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const sendTelemetry = async (status: 'NORMAL' | 'CRITICAL') => {
    // Telemetry is Public - No Token Needed
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

  const placeOrder = async () => {
    setLoadingOrder(true);
    
    try {
      // 2. SECURITY: Get the current user's ID Token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error("No security token found. Please login again.");
      }

      const payload = {
        shipId: "SHIP-FE-001",
        partId: "PISTON-RING-X2",
        quantity: 5
      };

      addLog(`📦 Placing Order for ${payload.partId}...`);
      
      // 3. Attach the Token to the Authorization Header
      await axios.post(`${API_URL}/orders`, payload, {
        headers: {
          Authorization: token 
        }
      });
      
      addLog(`✅ Order Placed successfully! (Authenticated)`);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Order Failed: ${err.response?.status === 401 ? 'Unauthorized (401)' : err.message}`);
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    // 4. Wrap everything in Authenticator
    // This provides the Login/Signup UI automatically
    <Authenticator>
      {({ signOut, user }) => (
        <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950">
          
          <header className="mb-12 text-center pb-6 border-b border-slate-800/50 relative">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 filter drop-shadow-lg">
              Nexus Marine
            </h1>
            <p className="text-slate-400 mt-3 text-lg tracking-wider uppercase">Fleet Command & Logistics Portal</p>
            
            {/* User Info & Logout */}
            <div className="absolute top-0 right-0 flex flex-col items-end">
              <span className="text-xs text-slate-500 mb-2">Logged in as: {user?.signInDetails?.loginId}</span>
              <button 
                onClick={signOut} 
                className="px-3 py-1 text-xs border border-red-900 text-red-400 hover:bg-red-900/20 rounded transition"
              >
                Sign Out
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* --- CARD 1: TELEMETRY (Public) --- */}
            <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl transition-all hover:shadow-cyan-900/20 hover:shadow-2xl">
              <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-2xl h-full">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
                  <span className="text-cyan-400 text-3xl">📡</span> Ship Telemetry
                </h2>
                <p className="text-slate-400 mb-8 text-sm">Simulate sensor readings. (Public Endpoint)</p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => sendTelemetry('NORMAL')} className="flex-1 cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold shadow-lg transition hover:-translate-y-1">Normal</button>
                  <button onClick={() => sendTelemetry('CRITICAL')} className="flex-1 cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold shadow-lg transition hover:-translate-y-1">Critical</button>
                </div>
              </div>
            </div>

            {/* --- CARD 2: ORDERS (Secured) --- */}
            <div className="relative group rounded-2xl p-[1px] bg-gradient-to-b from-slate-700 to-slate-900 shadow-xl transition-all hover:shadow-blue-900/20 hover:shadow-2xl">
               <div className="bg-slate-900/90 backdrop-blur-sm p-8 rounded-2xl h-full">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-100">
                  <span className="text-blue-400 text-3xl">📦</span> Quick Order
                </h2>
                <p className="text-slate-400 mb-6 text-sm">Place restock order. (Requires Authentication)</p>

                <div className="bg-black/40 p-4 rounded-lg border border-slate-800/60 mb-6 font-mono text-sm text-cyan-300/80">
                   <div className="flex justify-between mb-2"><span>Status:</span> <span className="text-emerald-400">Authenticated ✅</span></div>
                   <div className="flex justify-between"><span>User:</span> <span className="text-white">{user?.username}</span></div>
                </div>

                <button 
                  onClick={placeOrder}
                  disabled={loadingOrder}
                  className={`w-full cursor-pointer py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold shadow-lg transform transition hover:-translate-y-1 flex justify-center items-center ${loadingOrder ? 'opacity-70' : ''}`}
                >
                  {loadingOrder ? 'Processing...' : 'Place Secure Order'}
                </button>
              </div>
            </div>

          </div>

          <div className="mt-12">
            <h3 className="text-lg font-bold mb-4 text-slate-300">System Logs</h3>
            <div className="bg-black/80 p-4 rounded-xl font-mono text-xs md:text-sm h-64 overflow-y-auto border border-slate-800/60 shadow-inner custom-scrollbar">
              {log.map((entry, i) => <div key={i} className="mb-1.5 border-b border-slate-900/50 pb-1 text-slate-300">{entry}</div>)}
            </div>
          </div>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
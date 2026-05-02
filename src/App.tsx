import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Calendar, 
  Trophy, 
  Settings,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Target,
  ArrowLeft,
  X,
  MessageSquare,
  Map as MapIcon,
  Play,
  Square,
  Navigation,
  History,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';

interface JournalEntry {
  date: string;
  content: string;
}

interface HabitHistory {
  [date: string]: boolean;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  goal?: number;
  unit?: string;
  history: HabitHistory;
  journalEntries: JournalEntry[];
  createdAt: string;
}

interface ActivityPoint {
  lat: number;
  lng: number;
}

interface Activity {
  id: string;
  type: string;
  startTime: number;
  endTime?: number;
  path: ActivityPoint[];
  distance: number; // meters
  duration: number; // seconds
}

// Helper to get date string YYYY-MM-DD
const getDateStr = (date: Date = new Date()) => date.toISOString().split('T')[0];

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

export default function App() {
  const [view, setView] = useState<'habits' | 'activity'>('habits');
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('alphadaily_habits');
    if (saved) return JSON.parse(saved);
    
    const today = getDateStr();
    return [
      { 
        id: '1', 
        name: 'Minum Air', 
        description: 'Pastikan hidrasi tercukupi sepanjang hari',
        completed: false, 
        goal: 8, 
        unit: 'gelas',
        history: {}, 
        journalEntries: [],
        createdAt: today
      },
      { 
        id: '2', 
        name: 'Baca 10 menit', 
        description: 'Membangun kebiasaan membaca',
        completed: false, 
        history: {}, 
        journalEntries: [],
        createdAt: today
      },
      { 
        id: '3', 
        name: 'Olahraga', 
        description: 'Latihan fisik harian',
        completed: false, 
        history: {}, 
        journalEntries: [],
        createdAt: today
      },
    ];
  });
  
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('alphadaily_activities');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('alphadaily_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('alphadaily_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    // Sync current day status from history
    const today = getDateStr();
    setHabits(prev => prev.map(h => ({
      ...h,
      completed: !!h.history[today]
    })));
    setLoading(false);
  }, []);

  const toggleHabit = (id: string, forceValue?: boolean) => {
    const today = getDateStr();
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const newVal = forceValue !== undefined ? forceValue : !h.completed;
        return { 
          ...h, 
          completed: newVal,
          history: { ...h.history, [today]: newVal }
        };
      }
      return h;
    }));
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    if (selectedHabitId === id) setSelectedHabitId(null);
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      description: '',
      completed: false,
      history: {},
      journalEntries: [],
      createdAt: getDateStr()
    };
    setHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    setShowAddModal(false);
  };

  const updateHabitDetails = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const addJournalEntry = (habitId: string, content: string) => {
    if (!content.trim()) return;
    const today = getDateStr();
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return {
          ...h,
          journalEntries: [{ date: today, content: content.trim() }, ...h.journalEntries]
        };
      }
      return h;
    }));
  };

  const completedCount = habits.filter(h => h.completed).length;
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;
  
  const todayDisplay = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-400 flex items-center justify-center font-sans">
        <RefreshCw className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Header Section */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">
            Alpha<span className="text-indigo-600">Daily</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setView('habits')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'habits' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Habits
          </button>
          <button 
            onClick={() => setView('activity')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'activity' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            GPS Track
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Add Habit
          </button>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-start overflow-y-auto overflow-x-hidden">
        {view === 'habits' ? (
          <>
            {/* Sidebar Stats */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Penyelesaian Hari Ini</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-4xl font-bold text-slate-800">{Math.round(progress)}%</h2>
                  <p className="text-green-600 text-sm font-semibold mb-1">+{completedCount}</p>
                </div>
                <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="bg-indigo-500 h-full"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Statistik</p>
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Aktif</span>
                    <span className="text-sm font-bold text-slate-800">{habits.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Selesai</span>
                    <span className="text-sm font-bold text-slate-800">{completedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Grid Content */}
            <div className="col-span-12 lg:col-span-9 flex flex-col gap-8 h-full">
              {!selectedHabit ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{todayDisplay}</h2>
                      <p className="text-sm text-slate-400 mt-1">Lacak kemajuan harian Anda</p>
                    </div>
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                      <button className="px-4 py-2 bg-white rounded-lg text-xs font-bold shadow-sm">Grid</button>
                      <button className="px-4 py-2 text-xs font-bold text-slate-500 opacity-50 cursor-not-allowed">List</button>
                      <button className="px-4 py-2 text-xs font-bold text-slate-500 opacity-50 cursor-not-allowed">Stats</button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <AnimatePresence mode="popLayout">
                      {habits.map((habit) => (
                        <motion.div 
                          key={habit.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group grid grid-cols-12 items-center gap-6 p-1 rounded-2xl hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-12 md:col-span-4 flex items-center gap-4">
                            <button 
                              onClick={() => toggleHabit(habit.id)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                habit.completed 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'bg-white border border-slate-200 text-slate-300 hover:border-indigo-400'
                              }`}
                            >
                              {habit.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>
                            <div 
                              className="cursor-pointer flex-1"
                              onClick={() => setSelectedHabitId(habit.id)}
                            >
                              <p className={`font-bold text-slate-800 flex items-center gap-2 ${habit.completed ? 'opacity-50' : ''}`}>
                                {habit.name}
                                <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                              </p>
                              <p className={`text-xs text-slate-400 truncate max-w-[200px] ${habit.completed ? 'line-through' : ''}`}>
                                {habit.goal ? `${habit.goal} ${habit.unit || 'kali'}` : 'Manual tracking'}
                              </p>
                            </div>
                          </div>
                          <div className="col-span-12 md:col-span-8 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                            {Array.from({ length: 21 }).map((_, i) => {
                                const date = new Date();
                                date.setDate(date.getDate() - (20 - i));
                                const dateStr = getDateStr(date);
                                const done = !!habit.history[dateStr];
                                return (
                                  <div 
                                    key={i} 
                                    title={dateStr}
                                    className={`flex-1 min-w-[24px] h-8 rounded-md border transition-colors ${
                                      done 
                                        ? 'bg-indigo-500 border-indigo-600' 
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  />
                                );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {habits.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-400 font-medium mb-4">Belum ada kebiasaan yang dilacak.</p>
                        <button 
                          onClick={() => setShowAddModal(true)}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
                        >
                          <Plus className="w-5 h-5" />
                          Tambah Sekarang
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-8 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex gap-4">
                      <span>Less</span>
                      <div className="flex gap-1 items-center">
                        <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded"></div>
                        <div className="w-3 h-3 bg-indigo-200 rounded"></div>
                        <div className="w-3 h-3 bg-indigo-400 rounded"></div>
                        <div className="w-3 h-3 bg-indigo-600 rounded"></div>
                      </div>
                      <span>More</span>
                    </div>
                    <div>Terakhir perbarui: {new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              ) : (
                <HabitDetail 
                  habit={selectedHabit} 
                  onClose={() => setSelectedHabitId(null)}
                  onUpdate={(updates) => updateHabitDetails(selectedHabit.id, updates)}
                  onAddJournal={(content) => addJournalEntry(selectedHabit.id, content)}
                  onDelete={() => deleteHabit(selectedHabit.id)}
                />
              )}

              <footer className="h-16 bg-white border border-slate-200 rounded-2xl flex items-center px-8 shadow-sm">
                <div className="flex gap-8">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    Daily Tracker
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600 cursor-pointer">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    Monthly Report
                  </div>
                </div>
                <div className="ml-auto text-slate-300 text-[10px] font-bold uppercase">
                  AlphaDaily Apps • {new Date().getFullYear()}
                </div>
              </footer>
            </div>
          </>
        ) : (
          <ActivityTracker 
            activities={activities} 
            onSave={(activity) => setActivities(prev => [activity, ...prev])} 
            onDelete={(id) => setActivities(prev => prev.filter(a => a.id !== id))}
          />
        )}
      </main>

      <AnimatePresence>
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)}>
            <h2 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">Add New Habit</h2>
            <p className="text-sm text-slate-400 mb-8">Mulailah perjalanan baru Anda hari ini.</p>
            <form onSubmit={addHabit}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2 block">Habit Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g. Reading Books"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-800 font-medium"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-4 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-4 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityTracker({ activities, onSave, onDelete }: { 
  activities: Activity[], 
  onSave: (a: Activity) => void,
  onDelete: (id: string) => void
}) {
  const [isTracking, setIsTracking] = useState(false);
  const [path, setPath] = useState<ActivityPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [center, setCenter] = useState<ActivityPoint>({ lat: -6.200000, lng: 106.816666 }); // Jakarta default
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const startTracking = () => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      alert("Aplikasi memerlukan Google Maps API Key untuk fitur GPS. Silakan atur VITE_GOOGLE_MAPS_API_KEY di Secrets.");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setStartTime(Date.now());
    setPath([]);
    setDistance(0);
    setElapsedTime(0);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setPath(prevPath => {
          if (prevPath.length > 0) {
            const lastPoint = prevPath[prevPath.length - 1];
            const d = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
            setDistance(prev => prev + d);
          }
          return [...prevPath, newPoint];
        });
        setCenter(newPoint);
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (path.length > 1) {
      const newActivity: Activity = {
        id: Date.now().toString(),
        type: 'Running',
        startTime: startTime!,
        endTime: Date.now(),
        path,
        distance,
        duration: elapsedTime
      };
      onSave(newActivity);
    }

    setIsTracking(false);
    setStartTime(null);
  };

  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="col-span-12 grid grid-cols-12 gap-8 h-full min-h-[600px]">
      {/* Tracker Controls */}
      <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Navigation className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">GPS Track</h2>
                <p className="text-xs text-slate-400 font-medium">Lacak aktivitas luar ruangan Anda</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jarak</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatDistance(distance)}</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu</p>
              <h3 className="text-2xl font-bold text-slate-800">{formatTime(elapsedTime)}</h3>
            </div>
          </div>

          <div className="pt-4">
            {!isTracking ? (
              <button 
                onClick={startTracking}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="w-5 h-5 fill-current" />
                Mulai Aktivitas
              </button>
            ) : (
              <button 
                onClick={stopTracking}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95"
              >
                <Square className="w-5 h-5 fill-current" />
                Berhenti & Simpan
              </button>
            )}
          </div>
        </div>

        {/* History Activities */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Riwayat
            </h3>
            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-bold">{activities.length} Sesi</span>
          </div>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-hide">
             {activities.length > 0 ? activities.map((activity) => (
               <div key={activity.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{new Date(activity.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Lari Pagi • {activity.type}</p>
                    </div>
                    <button 
                      onClick={() => onDelete(activity.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3 h-3 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-600">{formatDistance(activity.distance)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-600">{formatTime(activity.duration)}</span>
                    </div>
                  </div>
               </div>
             )) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                  <ActivityIcon className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Belum ada aktivitas</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={15}
            options={{
               disableDefaultUI: true,
               zoomControl: true,
               styles: [
                  {
                    featureType: 'all',
                    elementType: 'geometry',
                    stylers: [{ color: '#f5f5f5' }]
                  },
                  {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#c9c9c9' }]
                  },
                  {
                    featureType: 'water',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#9e9e9e' }]
                  }
               ]
            }}
          >
            {path.length > 0 && (
              <>
                <Polyline
                  path={path}
                  options={{
                    strokeColor: '#4f46e5',
                    strokeOpacity: 0.8,
                    strokeWeight: 6,
                  }}
                />
                <Marker 
                  position={path[path.length - 1]}
                  icon={{
                    path: 0, // CIRCLE
                    scale: 7,
                    fillColor: '#4f46e5',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff',
                  }}
                />
              </>
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-8 text-center">
            {loadError ? (
              <div className="max-w-xs">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 mb-2">Maps Error</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Terjadi masalah saat memuat Google Maps. Ini biasanya karena API Key yang tidak valid atau masalah kuota.
                </p>
                <div className="mt-4 p-3 bg-slate-200/50 rounded-lg text-[10px] font-mono text-slate-600 break-all">
                  Error: {loadError.message || 'InvalidKeyMapError'}
                </div>
              </div>
            ) : (
              <div className="animate-pulse flex flex-col items-center">
                <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-4" />
                <p className="text-slate-400 font-bold">Memuat Peta...</p>
              </div>
            )}
          </div>
        )}

        {(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "") && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-8 z-10">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm text-center border border-slate-100">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Settings className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-3">API Key Diperlukan</h4>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Fitur GPS Tracking membutuhkan Google Maps API Key untuk berfungsi.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Instruksi:</p>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal ml-4">
                  <li>Buka panel <b>Secrets</b> di AI Studio.</li>
                  <li>Tambahkan <code>VITE_GOOGLE_MAPS_API_KEY</code>.</li>
                  <li>Masukkan kunci dari Google Cloud Console.</li>
                </ol>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">
                Aplikasi akan memuat ulang setelah kunci disimpan.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitDetail({ habit, onClose, onUpdate, onAddJournal, onDelete }: { 
  habit: Habit, 
  onClose: () => void,
  onUpdate: (updates: Partial<Habit>) => void,
  onAddJournal: (content: string) => void,
  onDelete: () => void
}) {
  const [journalInput, setJournalInput] = useState('');
  
  const historyValues = Object.values(habit.history).filter(v => !!v).length;
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const winRate = Math.round((historyValues / daysSinceCreated) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col flex-1 overflow-y-auto overflow-x-hidden"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-800 transition-all flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Kembali</span>
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (confirm('Hapus kebiasaan ini?')) onDelete();
            }}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-5 space-y-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tighter mb-4">{habit.name}</h2>
            <textarea 
              value={habit.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Tambahkan deskripsi..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 focus:outline-none focus:bg-white focus:border-indigo-200 min-h-[100px] resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Win Rate</p>
              <h4 className="text-2xl font-bold text-slate-800">{winRate}%</h4>
              <p className="text-xs text-slate-500 mt-1">{historyValues} hari tercapai</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dibuat</p>
              <h4 className="text-sm font-bold text-slate-800">{new Date(habit.createdAt).toLocaleDateString()}</h4>
              <p className="text-xs text-slate-500 mt-1">{daysSinceCreated} hari yang lalu</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Target className="w-3 h-3" />
              Tujuan Spesifik
            </h3>
            <div className="flex gap-4">
               <div className="flex-1 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold ml-1">Target</label>
                <input 
                  type="number"
                  value={habit.goal || ''}
                  onChange={(e) => onUpdate({ goal: Number(e.target.value) })}
                  placeholder="8"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-300"
                />
               </div>
               <div className="flex-1 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold ml-1">Satuan</label>
                <input 
                  type="text"
                  value={habit.unit || ''}
                  onChange={(e) => onUpdate({ unit: e.target.value })}
                  placeholder="gelas"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-indigo-300"
                />
               </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                History Kalender
              </h3>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] font-bold text-slate-300 py-1">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (34 - i));
                const dateStr = getDateStr(date);
                const done = !!habit.history[dateStr];
                const isToday = dateStr === getDateStr();
                
                return (
                  <div 
                    key={i}
                    title={dateStr}
                    className={`aspect-square rounded-lg border transition-all ${
                      done 
                        ? 'bg-indigo-600 border-indigo-700 shadow-sm' 
                        : isToday ? 'border-dashed border-indigo-300 bg-indigo-50/30' : 'bg-slate-50 border-slate-100'
                    }`}
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Journal & Progres
            </h3>
            
            <div className="relative">
              <textarea 
                value={journalInput}
                onChange={(e) => setJournalInput(e.target.value)}
                placeholder="Tuliskan progres Anda hari ini..."
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all min-h-[100px] resize-none"
              />
              <button 
                onClick={() => {
                  onAddJournal(journalInput);
                  setJournalInput('');
                }}
                className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md transition-all"
              >
                Kirim
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {habit.journalEntries.length > 0 ? habit.journalEntries.map((entry, i) => (
                <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                   <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md shadow-sm">{entry.date}</span>
                   </div>
                   <p className="text-sm text-slate-700 leading-relaxed font-medium">{entry.content}</p>
                </div>
              )) : (
                <div className="py-12 text-center">
                  <BookOpen className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-medium tracking-tight">Belum ada catatan jurnal.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] p-10 relative z-10 shadow-2xl"
      >
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full text-slate-300 hover:text-slate-600 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

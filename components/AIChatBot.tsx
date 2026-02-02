
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, RefreshCw, 
  Bot, User, Minimize2, Maximize2,
  HardHat, FileText, ExternalLink,
  ArrowRight, MapPin, Calendar, Clock,
  ListFilter, ShieldCheck, Target, 
  History, Users2, Hammer, Trash2, 
  Layout, Activity
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabaseClient';
import { useUser, useNotification } from '../App';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChatBot: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const { showNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "HHD System Intelligence Online. I've synced the latest Dashboard stats, Site Logs, and Project records. (Finance restricted). How can I assist?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // App Context Data
  const [appContext, setAppContext] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSystemIntelligence();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fetchSystemIntelligence = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch data surgicaly - limiting counts to prevent token overflow (429 prevention)
      const [leadsRes, projectsRes, visitsRes, constRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('id, client_name, status, created_at, is_client, deleted_at').order('created_at', { ascending: false }).limit(40),
        supabase.from('projects').select('id, name, status, created_at, deleted_at').order('created_at', { ascending: false }).limit(30),
        supabase.from('site_visits').select('id, visit_date, location, status, project:projects(name), lead:leads(client_name), deleted_at').order('visit_date', { ascending: false }).limit(20),
        supabase.from('construction_projects').select('id, title, current_stage, progress, status, deleted_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('id, full_name, designation, role, deleted_at').order('full_name', { ascending: true })
      ]);

      const leads = leadsRes.data || [];
      const projects = projectsRes.data || [];
      const visits = visitsRes.data || [];
      const construction = constRes.data || [];
      const team = profilesRes.data || [];

      // Highly compressed summary for AI consumption
      const summary = {
        date: today,
        stats: {
          leads: leads.filter(l => !l.deleted_at && !l.is_client).length,
          clients: leads.filter(l => !l.deleted_at && l.is_client).length,
          projects: projects.filter(p => !p.deleted_at).length,
          activeSites: construction.filter(c => !c.deleted_at && c.status === 'Active').length,
          binCount: [...leads, ...projects, ...visits, ...construction].filter(x => !!x.deleted_at).length
        },
        // Only send essential fields to save tokens
        recent: {
          leads: leads.filter(l => !l.deleted_at).slice(0, 15).map(l => ({ id: l.id, n: l.client_name, s: l.status, c: l.created_at?.split('T')[0] })),
          projects: projects.filter(p => !p.deleted_at).slice(0, 15).map(p => ({ id: p.id, n: p.name, s: p.status })),
          sites: construction.filter(c => !c.deleted_at).slice(0, 10).map(c => ({ id: c.id, t: c.title, st: c.current_stage, pr: c.progress })),
          team: team.filter(t => !t.deleted_at).map(t => ({ id: t.id, n: t.full_name, r: t.role })),
          bin: [...leads, ...projects, ...construction].filter(x => !!x.deleted_at).slice(0, 5).map((x: any) => ({ n: x.client_name || x.name || x.title, d: x.deleted_at?.split('T')[0] }))
        }
      };
      
      setAppContext(summary);
    } catch (err) {
      console.error("AI Context Sync Failure", err);
    }
  };

  const parseMessage = (text: string) => {
    const parts = text.split(/(\[\[LINK:[^\]]+\]\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[[LINK:')) {
        const match = part.match(/\[\[LINK:([^:]+):([^:]+):([^\]]+)\]\]/);
        if (match) {
          const [, type, id, label] = match;
          let path = '/';
          let Icon = ExternalLink;
          
          if (type === 'project') { path = `/projects/${id}`; Icon = Layout; }
          else if (type === 'lead') { path = `/leads/${id}`; Icon = User; }
          else if (type === 'visit') { path = `/site-visits/${id}`; Icon = MapPin; }
          else if (type === 'construction') { path = `/construction/${id}`; Icon = Hammer; }
          else if (type === 'team') { path = `/settings/staff/edit/${id}`; Icon = Users2; }

          return (
            <button 
              key={i}
              onClick={() => {
                navigate(path);
                if (window.innerWidth < 1024) setIsMinimized(true);
              }}
              className="my-2 flex items-center justify-between w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-900 transition-all group/link shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
                   <Icon className="w-5 h-5 text-[#064e3b]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 leading-none mb-1">{type}</p>
                  <p className="text-[13px] font-black tracking-tight leading-tight truncate max-w-[180px]">{label}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </button>
          );
        }
      }
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        Role: HHD Intelligence Agent. 
        Scope: Knowledge of Leads, Projects, Site Visits, Construction, Team, and Recycle Bin.
        Restriction: NO access to finance/cashbooks. Decline politely if asked.

        CONTEXT (TODAY: ${appContext?.date}):
        STATS: ${JSON.stringify(appContext?.stats)}
        ACTIVE_RECORDS: ${JSON.stringify(appContext?.recent)}

        RULES:
        1. Use 'c' date to answer "how many added today/this week".
        2. Construction: Track stage (st) and progress (pr).
        3. Bin: You see deleted items in 'bin' list.
        4. NAVIGATION: ONLY use [[LINK:type:id:label]] if user asks for a link or if identifying one specific record clearly.

        TONE: Architect-led, concise, efficient.
      `;

      // Limit history to 5 items to keep request small and prevent 429
      const history = messages.slice(-5).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 } // Disable thinking to save tokens and speed up response
        }
      });

      const responseText = response.text || "Synchronizing... please retry your inquiry.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      console.error("AI Core Error:", err);
      let errorMsg = "The intelligence core is currently recalibrating. Please provide a more specific name or ID for your request.";
      
      if (err.message?.includes('429')) {
        errorMsg = "Neural capacity reached. Please wait 60 seconds before your next request to allow the core to cool down.";
        showNotification("Neural Engine Quota Exhausted.", "warning");
      } else {
        showNotification("AI Core disconnected.", "error");
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] w-14 h-14 md:w-16 md:h-16 bg-[#064e3b] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20 group-hover:hidden" />
          <Bot className="w-7 h-7 md:w-8 md:h-8 relative z-10" />
        </button>
      )}

      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 z-[100] bg-white border border-slate-100 shadow-2xl rounded-[32px] md:rounded-[40px] flex flex-col transition-all duration-500 ease-out animate-in slide-in-from-bottom-10 ${
            isMinimized ? 'h-20 w-72' : 'h-[550px] md:h-[750px] w-[calc(100vw-48px)] md:w-[480px]'
          }`}
        >
          <div className={`p-5 md:p-6 flex items-center justify-between border-b border-slate-50 bg-[#064e3b] text-white rounded-t-[32px] md:rounded-t-[40px] shrink-0`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight leading-none uppercase">HHD Intelligence</h4>
                <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mt-1">High-Throughput Node</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/30">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                        {parseMessage(msg.text)}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-50 bg-white">
                {[
                  { label: "New Leads Today", icon: Target },
                  { label: "Construction Hub", icon: Hammer },
                  { label: "Staff List", icon: Users2 },
                  { label: "Recycle Bin", icon: Trash2 }
                ].map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { setInput(s.label); }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded-full border border-slate-100 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-50 rounded-b-[32px] md:rounded-b-[40px]">
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Search records or ask about status..."
                    className="w-full h-14 pl-6 pr-14 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:bg-white focus:border-emerald-500/20 transition-all"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#064e3b] text-white rounded-xl flex items-center justify-center hover:bg-black transition-all disabled:opacity-30 disabled:scale-95 active:scale-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest text-center mt-3 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Payload Optimization Active
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatBot;

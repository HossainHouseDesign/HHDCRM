
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
    { role: 'model', text: "HHD System Intelligence Online. I have full knowledge of the Dashboard, Leads, Projects, Site Visits, Construction progress, and the Team Directory. I can even help you find items in the Recycle Bin. How can I assist you?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // App Context Data (Everything except Finance)
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
      
      // Multi-module fetch for comprehensive app knowledge
      const [leadsRes, projectsRes, visitsRes, constRes, profilesRes] = await Promise.all([
        supabase.from('leads').select('id, client_name, status, created_at, is_client, deleted_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('projects').select('id, name, status, start_date, created_at, deleted_at').order('created_at', { ascending: false }),
        supabase.from('site_visits').select('id, visit_date, location, status, project:projects(name), lead:leads(client_name), created_at, deleted_at').order('visit_date', { ascending: false }).limit(60),
        supabase.from('construction_projects').select('id, title, current_stage, progress, status, created_at, deleted_at').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, designation, role, created_at, deleted_at').order('full_name', { ascending: true })
      ]);

      const leads = leadsRes.data || [];
      const projects = projectsRes.data || [];
      const visits = visitsRes.data || [];
      const construction = constRes.data || [];
      const team = profilesRes.data || [];

      // Consolidate "Dashboard" style statistics for AI reasoning
      const dashboardStats = {
        totalLeads: leads.filter(l => !l.deleted_at && !l.is_client).length,
        totalClients: leads.filter(l => !l.deleted_at && l.is_client).length,
        activeProjects: projects.filter(p => !p.deleted_at && p.status === 'Running').length,
        ongoingConstruction: construction.filter(c => !c.deleted_at && c.status === 'Active').length,
        teamSize: team.filter(t => !t.deleted_at).length
      };

      // Compact payload for AI consumption (minimizing tokens for Flash model)
      const summary = {
        todayDate: today,
        dashboard: dashboardStats,
        active: {
          leads: leads.filter(l => !l.deleted_at).map(l => ({ id: l.id, n: l.client_name, s: l.status, c: l.created_at?.split('T')[0] })),
          projects: projects.filter(p => !p.deleted_at).map(p => ({ id: p.id, n: p.name, s: p.status, c: p.created_at?.split('T')[0] })),
          visits: visits.filter(v => !v.deleted_at).map(v => ({ id: v.id, d: v.visit_date, s: v.status, n: v.project?.name || v.lead?.client_name })),
          construction: construction.filter(c => !c.deleted_at).map(c => ({ id: c.id, t: c.title, st: c.current_stage, pr: c.progress, s: c.status })),
          team: team.filter(t => !t.deleted_at).map(t => ({ id: t.id, n: t.full_name, r: t.role, d: t.designation }))
        },
        recycleBin: {
          leads: leads.filter(l => !!l.deleted_at).map(l => ({ n: l.client_name, d: l.deleted_at?.split('T')[0] })),
          projects: projects.filter(p => !!p.deleted_at).map(p => ({ n: p.name, d: p.deleted_at?.split('T')[0] })),
          visits: visits.filter(v => !!v.deleted_at).map(v => ({ n: v.project?.name || v.lead?.client_name, d: v.deleted_at?.split('T')[0] })),
          construction: construction.filter(c => !!c.deleted_at).map(c => ({ n: c.title, d: c.deleted_at?.split('T')[0] })),
          team: team.filter(t => !!t.deleted_at).map(t => ({ n: t.full_name, d: t.deleted_at?.split('T')[0] }))
        }
      };
      
      setAppContext(summary);
    } catch (err) {
      console.error("AI Context Refresh Failed", err);
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
          if (type === 'lead') { path = `/leads/${id}`; Icon = User; }
          if (type === 'visit') { path = `/site-visits/${id}`; Icon = MapPin; }
          if (type === 'construction') { path = `/construction/${id}`; Icon = Hammer; }
          if (type === 'team') { path = `/settings/staff/edit/${id}`; Icon = Users2; }

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
        Role: HHD Architectural System Intelligence.
        Scope: Full knowledge of Dashboard stats, Lead pipeline, Project vault, Site Visits, Construction status, Team directory, and the Recycle Bin.
        Restriction: You have NO access to finance, money, or payroll. Politely decline if asked.

        REAL-TIME CONTEXT:
        Current Date (Today): ${appContext?.todayDate}
        System Stats: ${JSON.stringify(appContext?.dashboard)}

        KNOWLEDGE BASE:
        - LEADS/CLIENTS: ${JSON.stringify(appContext?.active?.leads)}
        - PROJECTS: ${JSON.stringify(appContext?.active?.projects)}
        - VISITS: ${JSON.stringify(appContext?.active?.visits)}
        - CONSTRUCTION: ${JSON.stringify(appContext?.active?.construction)}
        - TEAM: ${JSON.stringify(appContext?.active?.team)}
        - RECYCLE BIN (Deleted Items): ${JSON.stringify(appContext?.recycleBin)}

        RULES:
        1. Use 'c' (created date) in leads/projects to answer "how many were added today/this week".
        2. Construction Analysis: You know the exact milestone (st) and progress percentage (pr) for sites.
        3. Bin Awareness: If a user asks for something not in active lists, check recycleBin.
        4. NAVIGATION: Only provide [[LINK:type:id:label]] if requested or if identifying one specific record clearly.

        TONE: Professional, Concise, Architect-led intelligence.
      `;

      // Optimized history for flash model
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Switched to Flash to resolve 429 quota issues
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          topP: 0.8
        }
      });

      const responseText = response.text || "Synchronizing with the neural engine... please retry your request.";
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      console.error("Neural Sync Error:", err);
      if (err.message?.includes('429')) {
        showNotification("Neural Engine Quota Exhausted. Cooling down...", "warning");
        setMessages(prev => [...prev, { role: 'model', text: "I've hit a processing rate limit. Please allow me 60 seconds to reset my intelligence core before your next inquiry." }]);
      } else {
        showNotification("AI Core disconnected.", "error");
        setMessages(prev => [...prev, { role: 'model', text: "Connectivity with the intelligence core was interrupted. Please re-establish the connection." }]);
      }
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
                <p className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-widest mt-1">Full System Access</p>
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
                  { label: "Construction Status", icon: Hammer },
                  { label: "New Leads Today", icon: Target },
                  { label: "Active Designs", icon: Layout },
                  { label: "Staff Directory", icon: Users2 },
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
                    placeholder="Search sites, team, or history..."
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
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> High-Throughput Neural Engine
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

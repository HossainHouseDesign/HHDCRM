
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, CheckCircle2, RefreshCw, 
  ArrowUpRight, Search, Bell, Plus, 
  FileText, TrendingUp, X, 
  Hammer, FileSpreadsheet, Command, UserCheck,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Activity, Target, ArrowRight, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Lead, Project } from '../types';
import { useNavigate } from 'react-router-dom';
import { useNotification, useUser } from '../App';

type Timeframe = 'Weekly' | 'Monthly' | 'Yearly';

interface DayMeta {
  followUps: { id: string, name: string }[];
  newLeads: { id: string, name: string }[];
  newClients: { id: string, name: string }[];
  completions: { id: string, name: string }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [constructions, setConstructions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  
  // Interaction State
  const [timeframe, setTimeframe] = useState<Timeframe>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
    const timer = setTimeout(() => setIsChartReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [leadsRes, projectsRes, constRes] = await Promise.all([
        supabase.from('leads').select('*').is('deleted_at', null),
        supabase.from('projects').select('*').is('deleted_at', null),
        supabase.from('construction_projects').select('*').is('deleted_at', null)
      ]);
      setLeads(leadsRes.data || []);
      setProjects(projectsRes.data || []);
      setConstructions(constRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ADVANCED INTERACTIVE DATA ENGINE
  const calendarData = useMemo(() => {
    const data: Record<string, DayMeta> = {};
    
    const ensureDate = (d: string) => {
      if (!data[d]) data[d] = { followUps: [], newLeads: [], newClients: [], completions: [] };
    };

    leads.forEach(l => {
      // 1. Follow Ups
      if (l.follow_up_date) {
        ensureDate(l.follow_up_date);
        data[l.follow_up_date].followUps.push({ id: l.id, name: l.client_name });
      }
      // 2. New Lead Ingestion
      const createdDate = l.created_at.split('T')[0];
      ensureDate(createdDate);
      data[createdDate].newLeads.push({ id: l.id, name: l.client_name });
      // 3. Client Conversions
      if (l.is_client && l.converted_at) {
        const convertedDate = l.converted_at.split('T')[0];
        ensureDate(convertedDate);
        data[convertedDate].newClients.push({ id: l.id, name: l.client_name });
      }
    });

    // 4. Project Completions
    projects.filter(p => p.status === 'Complete').forEach(p => {
       const completedDate = p.updated_at?.split('T')[0];
       if (completedDate) {
         ensureDate(completedDate);
         data[completedDate].completions.push({ id: p.id, name: p.name });
       }
    });

    return data;
  }, [leads, projects]);

  const selectedDayStats = useMemo(() => {
    return calendarData[selectedDate] || { followUps: [], newLeads: [], newClients: [], completions: [] };
  }, [calendarData, selectedDate]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);
    return days;
  }, [currentDate]);

  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= firstDayOfMonth).length;
    const clientsConvertedThisMonth = leads.filter(l => l.is_client && l.converted_at && new Date(l.converted_at) >= firstDayOfMonth).length;
    const projectsCompletedThisMonth = projects.filter(p => p.status === 'Complete' && p.updated_at && new Date(p.updated_at) >= firstDayOfMonth).length;
    return { leadsThisMonth, clientsConvertedThisMonth, projectsCompletedThisMonth, totalConstruction: constructions.length };
  }, [leads, timeframe, projects, constructions]);

  const analyticsData = useMemo(() => {
    if (loading) return [];
    let dataPoints: any[] = [];
    const now = new Date();

    if (timeframe === 'Weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i);
        dataPoints.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), dateKey: d.toISOString().split('T')[0], Leads: 0, Clients: 0 });
      }
    } else if (timeframe === 'Monthly') {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= lastDay; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        dataPoints.push({ name: i.toString(), dateKey: d.toISOString().split('T')[0], Leads: 0, Clients: 0 });
      }
    } else if (timeframe === 'Yearly') {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        dataPoints.push({ name: d.toLocaleDateString('en-US', { month: 'short' }), dateKey: `${now.getFullYear()}-${(i + 1).toString().padStart(2, '0')}`, Leads: 0, Clients: 0 });
      }
    }

    leads.forEach(l => {
      const d = new Date(l.created_at);
      const dayKey = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const point = dataPoints.find(p => timeframe === 'Yearly' ? p.dateKey === monthKey : p.dateKey === dayKey);
      if (point) point.Leads++;
    });

    leads.filter(l => l.is_client && l.converted_at).forEach(l => {
      const d = new Date(l.converted_at!);
      const dayKey = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const point = dataPoints.find(p => timeframe === 'Yearly' ? p.dateKey === monthKey : p.dateKey === dayKey);
      if (point) point.Clients++;
    });

    return dataPoints;
  }, [leads, timeframe, loading]);

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <RefreshCw className="w-10 h-10 text-[#064e3b] animate-spin" />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">Syncing Executive Workspace...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pb-24">
      <header className="sticky top-16 lg:top-0 z-40 bg-[#f8fafc]/80 backdrop-blur-md py-6 sm:py-8 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 border-b border-slate-50">
        <div className="relative w-full md:w-[450px]">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input type="text" placeholder="Secure Command Search..." className="w-full bg-white border border-slate-100 rounded-[24px] h-14 pl-14 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#064e3b]/5 transition-all shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-6">
          <button className="p-4 bg-white border border-slate-100 rounded-2xl
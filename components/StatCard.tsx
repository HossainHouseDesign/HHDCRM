
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: string;
  bgColor?: string;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon: Icon, trend, bgColor = "bg-white", iconColor = "bg-emerald-50 text-emerald-600" }) => {
  return (
    <div className={`${bgColor} p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-xl font-bold ${bgColor === 'bg-white' ? 'text-slate-900' : 'text-white'}`}>{value}</h3>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {subValue && (
        <div className="mt-4 pt-3 border-t border-slate-50/10">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter truncate">{subValue}</p>
        </div>
      )}
    </div>
  );
};

export default StatCard;

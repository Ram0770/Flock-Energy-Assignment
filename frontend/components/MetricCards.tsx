"use client";

import React from "react";
import { motion } from "framer-motion";
import { Database, AlertTriangle, Activity, Zap, TrendingUp } from "lucide-react";
import { Meter } from "../lib/api";

interface MetricCardsProps {
  meters: Meter[];
}

export function MetricCards({ meters }: MetricCardsProps) {
  const activeCount = meters.filter((m) => m.status === "Active").length;
  const faultyCount = meters.filter((m) => m.status === "Faulty").length;
  const inactiveCount = meters.filter((m) => m.status === "Inactive").length;

  // Let's compute some simulated grid load
  // Smart meters draw simulated active load. Active meters: ~50kW average load, faulty: ~1kW.
  const totalLoad = activeCount * 45 + faultyCount * 1.5;
  const powerFactorAvg = activeCount > 0 ? 0.93 : 0.00;

  const cardData = [
    {
      title: "Total Monitored Meters",
      value: meters.length,
      subtext: `${activeCount} Active | ${inactiveCount} Offline`,
      icon: Database,
      glow: "from-blue-500/20 to-indigo-500/10",
      iconColor: "text-blue-500 dark:text-blue-400",
      sparkline: [20, 24, 22, 28, 26, 30, 32],
    },
    {
      title: "Active Grid Load",
      value: `${totalLoad.toLocaleString()} kW`,
      subtext: "+4.2% peak demand delta",
      icon: Zap,
      glow: "from-amber-500/20 to-orange-500/10",
      iconColor: "text-amber-500 dark:text-amber-400",
      sparkline: [40, 50, 48, 55, 62, 58, 68],
    },
    {
      title: "Average Power Factor",
      value: powerFactorAvg.toFixed(2),
      subtext: "System efficiency: High",
      icon: Activity,
      glow: "from-emerald-500/20 to-teal-500/10",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      sparkline: [92, 94, 93, 95, 94, 93, 95],
    },
    {
      title: "Critical Alarm Status",
      value: faultyCount,
      subtext: faultyCount > 0 ? `${faultyCount} unit failure events` : "No fault alarms triggered",
      icon: AlertTriangle,
      glow: faultyCount > 0 ? "from-red-500/20 to-rose-500/10 animate-pulse" : "from-zinc-500/10 to-zinc-500/5",
      iconColor: faultyCount > 0 ? "text-red-500 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500",
      sparkline: faultyCount > 0 ? [0, 1, 0, 2, 1, 0, faultyCount] : [0, 0, 0, 0, 0, 0, 0],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cardData.map((card, idx) => {
        const Icon = card.icon;
        
        return (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`relative overflow-hidden rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-5 shadow-lg group`}
          >
            {/* Glow backing */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-tr ${card.glow} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative flex items-center justify-between z-10">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 tracking-wider">
                {card.title}
              </span>
              <Icon className={`${card.iconColor}`} size={18} />
            </div>

            <div className="relative mt-4 z-10 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                {card.value}
              </h3>
            </div>

            <div className="relative mt-1.5 z-10 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
              <span>{card.subtext}</span>
            </div>

            {/* Sparkline canvas graph */}
            <div className="mt-4 h-6 w-full opacity-60 group-hover:opacity-90 transition-opacity z-10 relative">
              <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path
                  d={`M ${card.sparkline.map((val, i) => `${(i * 100) / (card.sparkline.length - 1)} ${20 - (val / Math.max(...card.sparkline, 1)) * 18}`).join(" L ")}`}
                  fill="none"
                  stroke={idx === 3 && faultyCount > 0 ? "#ef4444" : "#6366f1"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

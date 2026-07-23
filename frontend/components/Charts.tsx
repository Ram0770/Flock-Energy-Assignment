"use client";

import React, { useState } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Zap, Activity, ShieldAlert } from "lucide-react";
import { ConsumptionReading } from "../lib/api";

interface ChartsProps {
  readings: ConsumptionReading[];
}

export function Charts({ readings }: ChartsProps) {
  const [activeChart, setActiveChart] = useState<"active" | "reactive" | "demand">("active");

  const formattedData = [...readings].reverse(); // Chart reads chronologically left-to-right

  const getChartTitle = () => {
    switch (activeChart) {
      case "active":
        return "Active Energy Log (kWh)";
      case "reactive":
        return "Reactive Energy Log (kVARh)";
      case "demand":
        return "Max Load Recorded Demand (kW)";
    }
  };

  const getChartDescription = () => {
    switch (activeChart) {
      case "active":
        return "Daily active energy usage history showing operational grid draw patterns.";
      case "reactive":
        return "Reactive energy logs used to calculate system power factor and efficiency gaps.";
      case "demand":
        return "Peak recorded active power draw timestamps showing load spikes.";
    }
  };

  // Styled glass tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="backdrop-blur-md bg-slate-900/80 dark:bg-black/80 border border-white/20 dark:border-white/10 p-3 rounded-lg text-xs text-white shadow-xl">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((item: any, i: number) => (
            <p key={i} style={{ color: item.color }}>
              {item.name}: <strong className="font-bold">{item.value.toLocaleString()} {item.unit}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl text-slate-800 dark:text-zinc-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold">{getChartTitle()}</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500">{getChartDescription()}</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-lg bg-slate-200/40 dark:bg-zinc-900/40 border border-slate-200/10 dark:border-white/5 backdrop-blur-sm self-start md:self-auto">
          <button
            onClick={() => setActiveChart("active")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeChart === "active"
                ? "bg-indigo-600 dark:bg-emerald-500 text-white shadow-sm"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap size={12} />
            <span>Active</span>
          </button>
          <button
            onClick={() => setActiveChart("reactive")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeChart === "reactive"
                ? "bg-indigo-600 dark:bg-emerald-500 text-white shadow-sm"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Activity size={12} />
            <span>Reactive</span>
          </button>
          <button
            onClick={() => setActiveChart("demand")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeChart === "demand"
                ? "bg-indigo-600 dark:bg-emerald-500 text-white shadow-sm"
                : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldAlert size={12} />
            <span>Demand</span>
          </button>
        </div>
      </div>

      {/* Chart Plotting area */}
      <div className="h-[320px] w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === "active" ? (
            <LineChart data={formattedData}>
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#808080" opacity={0.1} />
              <XAxis dataKey="date" stroke="#888888" tickLine={false} />
              <YAxis stroke="#888888" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="energy_kwh"
                name="Active Energy"
                unit="kWh"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          ) : activeChart === "reactive" ? (
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#808080" opacity={0.1} />
              <XAxis dataKey="date" stroke="#888888" tickLine={false} />
              <YAxis stroke="#888888" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="reactive_kvarh" 
                name="Reactive Energy" 
                unit="kVARh" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={formattedData}>
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#808080" opacity={0.1} />
              <XAxis dataKey="date" stroke="#888888" tickLine={false} />
              <YAxis stroke="#888888" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="demand_kw"
                name="Recorded Demand"
                unit="kW"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#demandGrad)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

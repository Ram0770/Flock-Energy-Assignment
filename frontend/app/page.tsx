"use client";

import React, { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchMeters, 
  fetchHierarchy, 
  fetchMeterDetail, 
  fetchMeterConsumption, 
  Meter 
} from "../lib/api";
import { useApp } from "../components/providers";
import { AnimatedSidebar } from "../components/AnimatedSidebar";
import { MeshBackground } from "../components/MeshBackground";
import { MetricCards } from "../components/MetricCards";
import { HierarchyTree } from "../components/HierarchyTree";
import { Charts } from "../components/Charts";
import { CommandPalette } from "../components/CommandPalette";
import dynamic from "next/dynamic";
import { 
  Search, 
  SlidersHorizontal, 
  Database, 
  Activity, 
  Zap, 
  ShieldAlert, 
  MapPin, 
  Calendar,
  X,
  RefreshCw,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import for Leaflet Map to avoid SSR errors
const MeterMap = dynamic(() => import("../components/MeterMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl flex items-center justify-center bg-slate-200/5 dark:bg-zinc-950/20 border border-slate-200/10 dark:border-white/10 backdrop-blur-xl animate-pulse text-zinc-500">
      Loading Leaflet map...
    </div>
  ),
});

export default function DashboardPage() {
  const { 
    activeView, 
    setActiveView, 
    selectedMeterId, 
    setSelectedMeterId 
  } = useApp();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [controlLogs, setControlLogs] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Queries
  const { data: meters = [], isLoading: isLoadingMeters, isError: isErrorMeters, refetch: refetchMeters } = useQuery({
    queryKey: ["meters"],
    queryFn: fetchMeters,
  });

  const { data: hierarchy = [], isLoading: isLoadingHierarchy } = useQuery({
    queryKey: ["hierarchy"],
    queryFn: fetchHierarchy,
  });

  const { data: selectedMeter, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["meterDetail", selectedMeterId],
    queryFn: () => fetchMeterDetail(selectedMeterId!),
    enabled: !!selectedMeterId,
  });

  const { data: selectedConsumption, isLoading: isLoadingConsumption } = useQuery({
    queryKey: ["meterConsumption", selectedMeterId],
    queryFn: () => fetchMeterConsumption(selectedMeterId!),
    enabled: !!selectedMeterId,
  });

  // Filter meters
  const filteredMeters = meters.filter((meter) => {
    const matchesSearch = 
      meter.serial_number.toLowerCase().includes(search.toLowerCase()) ||
      meter.location.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || meter.status === statusFilter;
    const matchesPhase = phaseFilter === "All" || meter.phase === phaseFilter;
    
    return matchesSearch && matchesStatus && matchesPhase;
  });

  // Simulation controls handler
  const handleTriggerSelfTest = (serial: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setControlLogs((prev) => [
      `[${timestamp}] Initiated diagnostics for ${serial}`,
      `[${timestamp}] Connecting to grid cell...`,
      `[${timestamp}] Test complete: Phase voltages nominal. Signal strength: 94%.`,
      ...prev,
    ]);
  };

  const handleRemoteReset = (serial: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setControlLogs((prev) => [
      `[${timestamp}] Sent command code: SIG_RESET to ${serial}`,
      `[${timestamp}] Reboot command acknowledged. Current operational parameters reset.`,
      ...prev,
    ]);
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-100 dark:bg-zinc-950 font-sans text-slate-800 dark:text-zinc-100 transition-colors">
      <MeshBackground />
      <AnimatedSidebar />
      <CommandPalette />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-6 lg:p-8 relative z-0">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
              Smart Energy Ops Portal
            </h1>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Legacy Urja Meter integrations normalized via API layer.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                refetchMeters();
                const ts = new Date().toLocaleTimeString();
                setControlLogs(prev => [`[${ts}] Flushed local cache, scraped legacy endpoints`, ...prev]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.8 rounded-lg text-xs font-semibold border border-slate-200/10 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/5 backdrop-blur-sm shadow-sm transition-all"
            >
              <RefreshCw size={12} className={isLoadingMeters ? "animate-spin" : ""} />
              <span>Force Scrape Sync</span>
            </button>
          </div>
        </header>

        {/* Global Loading / Error State */}
        {isLoadingMeters ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            <div className="h-32 bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
            <div className="h-32 bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
            <div className="h-32 bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
            <div className="h-32 bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
            <div className="md:col-span-3 h-[400px] bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
            <div className="h-[400px] bg-slate-200/40 dark:bg-white/5 rounded-xl border border-slate-200/10 dark:border-white/10 backdrop-blur-sm" />
          </div>
        ) : isErrorMeters ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center rounded-2xl border border-dashed border-red-500/30 p-12 bg-red-500/5 max-w-xl mx-auto my-12 backdrop-blur-md">
            <ShieldAlert size={48} className="text-red-500 dark:text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-red-500 dark:text-red-400">Scraping Connection Failure</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">
                Could not retrieve telemetry from the legacy Urja portal server. Ensure backend gateway service is running.
              </p>
            </div>
            <button
              onClick={() => refetchMeters()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: DASHBOARD VIEW */}
            {activeView === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                <MetricCards meters={meters} />

                {/* Map & Tree Segment */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <MeterMap meters={meters} onSelectMeter={(id) => {
                      setSelectedMeterId(id);
                      setActiveView("meters");
                    }} />
                  </div>
                  <div>
                    <HierarchyTree nodes={hierarchy} onSelectMeter={(id) => {
                      setSelectedMeterId(id);
                      setActiveView("meters");
                    }} />
                  </div>
                </div>

                {/* Quick Asset List Table */}
                <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl">
                  <h3 className="text-base font-bold mb-4">Core Assets Quicklist</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/10 dark:border-white/5 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                          <th className="py-3 px-2">Serial</th>
                          <th className="py-3 px-2">Spatial Node</th>
                          <th className="py-3 px-2">Config Type</th>
                          <th className="py-3 px-2">Status</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meters.slice(0, 5).map((m) => (
                          <tr key={m.id} className="border-b border-slate-200/5 dark:border-white/5 hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-mono font-bold text-slate-900 dark:text-white">{m.serial_number}</td>
                            <td className="py-3 px-2 text-slate-500 dark:text-zinc-400">{m.location}</td>
                            <td className="py-3 px-2 text-slate-500 dark:text-zinc-400">{m.phase}</td>
                            <td className="py-3 px-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                m.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : m.status === "Faulty" ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-500"
                              }`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => {
                                  setSelectedMeterId(m.id);
                                  setActiveView("meters");
                                }}
                                className="text-indigo-600 dark:text-emerald-400 font-semibold hover:underline"
                              >
                                Detail Page &rarr;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: METERS INVENTORY VIEW */}
            {activeView === "meters" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Main list view */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Filter Toolbar */}
                  <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl shadow-lg">
                    {/* Search input */}
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-200/40 dark:bg-zinc-900/40 border border-slate-200/10 dark:border-white/5 backdrop-blur-sm">
                      <Search size={14} className="text-slate-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none text-xs focus:ring-0 focus:outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                    {/* Filters dropdowns */}
                    <div className="flex items-center gap-3">
                      <SlidersHorizontal size={14} className="text-slate-400 dark:text-zinc-500" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-200/40 dark:bg-zinc-900/40 border border-slate-200/10 dark:border-white/5 rounded-lg text-xs p-2 text-slate-800 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Faulty">Faulty</option>
                      </select>
                      <select
                        value={phaseFilter}
                        onChange={(e) => setPhaseFilter(e.target.value)}
                        className="bg-slate-200/40 dark:bg-zinc-900/40 border border-slate-200/10 dark:border-white/5 rounded-lg text-xs p-2 text-slate-800 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="All">All Phases</option>
                        <option value="Single Phase">Single Phase</option>
                        <option value="Three Phase">Three Phase</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Inventory Card */}
                  <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/10 dark:border-white/5 text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">
                            <th className="py-3 px-2">Serial</th>
                            <th className="py-3 px-2">Location</th>
                            <th className="py-3 px-2">Layout Type</th>
                            <th className="py-3 px-2">Commission Date</th>
                            <th className="py-3 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMeters.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center p-8 text-slate-400 dark:text-zinc-500">
                                No assets matched standard filters.
                              </td>
                            </tr>
                          ) : (
                            filteredMeters.map((m) => {
                              const isSelected = selectedMeterId === m.id;
                              return (
                                <tr
                                  key={m.id}
                                  onClick={() => setSelectedMeterId(m.id)}
                                  className={`border-b border-slate-200/5 dark:border-white/5 hover:bg-slate-200/20 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                                    isSelected ? "bg-indigo-500/10 dark:bg-emerald-500/10" : ""
                                  }`}
                                >
                                  <td className="py-3.5 px-2 font-mono font-bold text-slate-900 dark:text-white">{m.serial_number}</td>
                                  <td className="py-3.5 px-2 text-slate-500 dark:text-zinc-400">{m.location}</td>
                                  <td className="py-3.5 px-2 text-slate-500 dark:text-zinc-400">{m.phase}</td>
                                  <td className="py-3.5 px-2 text-slate-500 dark:text-zinc-400">{m.installation_date}</td>
                                  <td className="py-3.5 px-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                      m.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : m.status === "Faulty" ? "bg-red-500/10 text-red-400" : "bg-zinc-500/10 text-zinc-500"
                                    }`}>
                                      {m.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Inspect Side Spec Sheet Panel */}
                <div className="lg:col-span-1">
                  <AnimatePresence mode="wait">
                    {!selectedMeterId ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-8 shadow-xl text-center h-[500px] flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500"
                      >
                        <Database size={36} className="mb-3 text-zinc-500/50" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Inspection spec sheet</h4>
                        <p className="text-xs mt-1 max-w-[200px]">Select a meter from inventory table to view technical parameters and consumption graphs.</p>
                      </motion.div>
                    ) : isLoadingDetail || !selectedMeter ? (
                      <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-8 shadow-xl h-[500px] flex items-center justify-center text-zinc-500 animate-pulse">
                        Loading detailed specifications...
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-5 shadow-xl space-y-6"
                      >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">AssetSpec: {selectedMeter.serial_number}</h3>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">GRID REF: #{selectedMeter.id}</span>
                          </div>
                          <button
                            onClick={() => setSelectedMeterId(null)}
                            className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-white/5 text-zinc-400"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Spec sheet parameters list */}
                        <div className="grid grid-cols-2 gap-4 border border-slate-200/10 dark:border-white/5 p-3 rounded-lg bg-slate-200/10 dark:bg-black/20 text-xs">
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">RMS VOLTAGE</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">{selectedMeter.voltage} V</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">RMS CURRENT</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">{selectedMeter.current} A</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">POWER FACTOR</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">{selectedMeter.power_factor}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">PHASE TYPE</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{selectedMeter.phase}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-200/10 dark:border-white/5 pt-2 mt-1">
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">LOCATION</span>
                            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                              <MapPin size={10} className="text-indigo-500" />
                              {selectedMeter.location}
                            </span>
                          </div>
                          <div className="col-span-2 border-t border-slate-200/10 dark:border-white/5 pt-2 mt-1">
                            <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">GRID PATHWAY</span>
                            <span className="font-semibold text-[10px] text-slate-900 dark:text-white">
                              {selectedMeter.zone} &gt; {selectedMeter.circle} &gt; {selectedMeter.substation} &gt; {selectedMeter.transformer}
                            </span>
                          </div>
                        </div>

                        {/* Interactive operations drawer */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Remote Operations Link</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTriggerSelfTest(selectedMeter.serial_number)}
                              className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 dark:bg-emerald-500 text-white font-bold text-[10px] hover:bg-indigo-700 dark:hover:bg-emerald-600 shadow transition-colors flex items-center justify-center gap-1"
                            >
                              <Cpu size={10} />
                              <span>Self Diagnosis</span>
                            </button>
                            <button
                              onClick={() => handleRemoteReset(selectedMeter.serial_number)}
                              className="flex-1 py-2 px-3 rounded-lg border border-red-500/20 text-red-500 font-bold text-[10px] hover:bg-red-500/5 transition-colors flex items-center justify-center gap-1"
                            >
                              <ShieldAlert size={10} />
                              <span>Remote Reset</span>
                            </button>
                          </div>
                        </div>

                        {/* Historical readings chart */}
                        {selectedConsumption && selectedConsumption.readings ? (
                          <Charts readings={selectedConsumption.readings.slice(0, 10)} />
                        ) : (
                          <div className="h-32 bg-slate-200/10 dark:bg-white/5 rounded-lg flex items-center justify-center text-zinc-500 animate-pulse text-[10px]">
                            Scraping historical energy graphs...
                          </div>
                        )}

                        {/* Device Logs */}
                        {controlLogs.length > 0 && (
                          <div className="border border-slate-200/10 dark:border-white/5 rounded-lg p-3 bg-black/45 text-[10px] font-mono text-emerald-400 overflow-y-auto max-h-[100px] space-y-1">
                            {controlLogs.map((log, idx) => (
                              <div key={idx}>{log}</div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: HIERARCHY TREE VIEW */}
            {activeView === "hierarchy" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto"
              >
                <HierarchyTree nodes={hierarchy} onSelectMeter={(id) => {
                  setSelectedMeterId(id);
                  setActiveView("meters");
                }} />
              </motion.div>
            )}

            {/* VIEW 4: MAP VIEW */}
            {activeView === "map" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <MeterMap meters={meters} onSelectMeter={(id) => {
                  setSelectedMeterId(id);
                  setActiveView("meters");
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Activity, 
  Network, 
  Map, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Terminal, 
  Database,
  Search
} from "lucide-react";
import { useApp } from "./providers";

export function AnimatedSidebar() {
  const { 
    activeView, 
    setActiveView, 
    theme, 
    toggleTheme, 
    setIsCommandPaletteOpen 
  } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "meters", label: "Meter Inventory", icon: Database },
    { id: "hierarchy", label: "Grid Network", icon: Network },
    { id: "map", label: "Spatial Map", icon: Map },
  ] as const;

  return (
    <motion.div
      animate={{ width: isExpanded ? 240 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen border-r border-slate-200/20 dark:border-white/10 backdrop-blur-xl bg-white/40 dark:bg-zinc-950/40 text-slate-800 dark:text-zinc-200 z-10"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-400 text-white font-bold shadow-md shadow-indigo-500/20">
            F
          </div>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent"
            >
              Flock Energy
            </motion.span>
          )}
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors hidden md:block"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Search Trigger (Ctrl+K preview) */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center justify-between w-full p-2.5 rounded-lg text-xs text-slate-400 dark:text-zinc-500 hover:bg-slate-200/40 dark:hover:bg-white/5 border border-slate-200/10 dark:border-white/5 backdrop-blur-sm transition-all"
        >
          <div className="flex items-center gap-2">
            <Search size={14} />
            {isExpanded && <span>Command Palette</span>}
          </div>
          {isExpanded && <span className="bg-slate-200/50 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Ctrl+K</span>}
        </button>
      </div>

      {/* Menu Options */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex items-center w-full gap-3 p-3 rounded-lg text-sm font-medium transition-all group ${
                isActive 
                  ? "text-indigo-600 dark:text-emerald-400" 
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {/* Active Background Slide */}
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 rounded-lg bg-indigo-500/5 dark:bg-emerald-500/5 border-l-2 border-indigo-600 dark:border-emerald-400 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon size={18} className="relative z-10 transition-transform group-hover:scale-105" />
              
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Toggle */}
      <div className="p-4 border-t border-slate-200/10 dark:border-white/5">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {isExpanded && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
      </div>
    </motion.div>
  );
}

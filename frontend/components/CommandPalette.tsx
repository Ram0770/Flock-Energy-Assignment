"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Database, Network, Map, FileText, X } from "lucide-react";
import { useApp } from "./providers";
import { fetchMeters, Meter } from "../lib/api";

export function CommandPalette() {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setActiveView, setSelectedMeterId } = useApp();
  const [query, setQuery] = useState("");
  const [meters, setMeters] = useState<Meter[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load meters list on mount or when search opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      fetchMeters().then(setMeters);
      setSelectedIndex(0);
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCommandPaletteOpen]);

  // Filter options
  const views = [
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutIcon },
    { id: "meters", label: "Open Meter Inventory", icon: Database },
    { id: "hierarchy", label: "View Grid Network Tree", icon: Network },
    { id: "map", label: "Open Spatial Map View", icon: Map },
  ];

  const filteredViews = views.filter((v) =>
    v.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredMeters = meters.filter(
    (m) =>
      m.serial_number.toLowerCase().includes(query.toLowerCase()) ||
      m.location.toLowerCase().includes(query.toLowerCase())
  );

  const totalItems = filteredViews.length + filteredMeters.length;

  // Handle keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;

      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        triggerAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, totalItems, filteredViews, filteredMeters]);

  const triggerAction = () => {
    if (selectedIndex < filteredViews.length) {
      const selectedView = filteredViews[selectedIndex];
      setActiveView(selectedView.id as any);
    } else {
      const meterIndex = selectedIndex - filteredViews.length;
      const selectedMeter = filteredMeters[meterIndex];
      setSelectedMeterId(selectedMeter.id);
      setActiveView("meters");
    }
    setIsCommandPaletteOpen(false);
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCommandPaletteOpen(false)}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
        />

        {/* Palette dialog card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200/20 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl shadow-2xl"
        >
          {/* Header search bar */}
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200/10 dark:border-white/5">
            <Search className="text-zinc-400 dark:text-zinc-500" size={18} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search meters, grid views, locations..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent border-0 text-sm focus:ring-0 focus:outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600"
            />
            <button
              onClick={() => setIsCommandPaletteOpen(false)}
              className="p-1 rounded-md hover:bg-zinc-200/30 dark:hover:bg-white/10 text-zinc-400 dark:text-zinc-500"
            >
              <X size={14} />
            </button>
          </div>

          {/* Results section */}
          <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
            {totalItems === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No matching grid nodes or actions found. Try looking for "FLK" or "Indiranagar".
              </div>
            ) : (
              <>
                {/* Views category */}
                {filteredViews.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-600">
                      System Navigation
                    </div>
                    {filteredViews.map((item, idx) => {
                      const Icon = item.icon;
                      const isHovered = selectedIndex === idx;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedIndex(idx);
                            setActiveView(item.id as any);
                            setIsCommandPaletteOpen(false);
                          }}
                          className={`flex items-center justify-between w-full p-2.5 rounded-lg text-left text-xs transition-colors ${
                            isHovered
                              ? "bg-indigo-600/10 dark:bg-emerald-500/10 text-indigo-600 dark:text-emerald-400"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/20 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={14} />
                            <span>{item.label}</span>
                          </div>
                          {isHovered && <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Enter</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Meters category */}
                {filteredMeters.length > 0 && (
                  <div className="mt-2">
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-600">
                      Physical Assets ({filteredMeters.length})
                    </div>
                    {filteredMeters.map((item, idx) => {
                      const absoluteIdx = filteredViews.length + idx;
                      const isHovered = selectedIndex === absoluteIdx;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedIndex(absoluteIdx);
                            setSelectedMeterId(item.id);
                            setActiveView("meters");
                            setIsCommandPaletteOpen(false);
                          }}
                          className={`flex items-center justify-between w-full p-2.5 rounded-lg text-left text-xs transition-colors ${
                            isHovered
                              ? "bg-indigo-600/10 dark:bg-emerald-500/10 text-indigo-600 dark:text-emerald-400"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/20 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Database size={14} />
                            <div>
                              <div className="font-semibold text-zinc-800 dark:text-zinc-200">{item.serial_number}</div>
                              <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{item.location}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                item.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : item.status === "Inactive"
                                  ? "bg-zinc-500/10 text-zinc-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {item.status}
                            </span>
                            {isHovered && <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Enter</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Quick layout icon fallback for compile
function LayoutIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={{ width: props.size, height: props.size }}
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

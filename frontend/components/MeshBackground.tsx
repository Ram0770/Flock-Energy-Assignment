"use client";

import React from "react";

export function MeshBackground() {
  return (
    <div className="absolute inset-0 -z-50 overflow-hidden pointer-events-none">
      {/* Dark/Light mesh gradient overlays */}
      <div className="absolute -inset-[10px] opacity-50 dark:opacity-30">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/30 blur-[100px] animate-pulse"
          style={{ animationDuration: "12s" }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-emerald-400/10 to-blue-500/30 blur-[120px] animate-pulse"
          style={{ animationDuration: "16s", animationDelay: "2s" }}
        />
        <div 
          className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-bl from-pink-500/10 to-violet-500/20 blur-[90px] animate-pulse"
          style={{ animationDuration: "14s", animationDelay: "4s" }}
        />
      </div>
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"
      />
    </div>
  );
}

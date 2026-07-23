"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Circle, 
  Cpu, 
  Database,
  Search,
  Grid
} from "lucide-react";
import { HierarchyNode } from "../lib/api";

interface HierarchyTreeProps {
  nodes: HierarchyNode[];
  onSelectMeter: (id: string) => void;
}

export function HierarchyTree({ nodes, onSelectMeter }: HierarchyTreeProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredNodes = nodes; // We can filter children recursively, but displaying the full tree is standard

  return (
    <div className="rounded-xl border border-slate-200/10 dark:border-white/10 bg-white/5 dark:bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl text-slate-800 dark:text-zinc-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Physical Grid Asset Network Map</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Explore distribution substations, transformers, and individual smart meters.</p>
        </div>
      </div>

      <div className="border border-slate-200/10 dark:border-white/5 rounded-lg overflow-hidden bg-slate-200/5 dark:bg-black/25">
        <div className="p-4 space-y-4">
          {filteredNodes.map((node, idx) => (
            <TreeNodeItem key={idx} node={node} depth={0} onSelectMeter={onSelectMeter} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TreeNodeItemProps {
  node: HierarchyNode;
  depth: number;
  onSelectMeter: (id: string) => void;
}

function TreeNodeItem({ node, depth, onSelectMeter }: TreeNodeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Open root branches by default

  const hasChildren = node.children && node.children.length > 0;
  const isMeter = node.type === "meter" && node.meter;

  const handleToggle = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else if (isMeter && node.meter) {
      onSelectMeter(node.meter.id);
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case "zone":
        return <Grid className="text-indigo-500 dark:text-indigo-400" size={16} />;
      case "circle":
        return <Layers className="text-purple-500 dark:text-purple-400" size={16} />;
      case "substation":
        return <Circle className="text-cyan-500 dark:text-cyan-400" size={16} fill="currentColor" />;
      case "transformer":
        return <Cpu className="text-amber-500 dark:text-amber-400" size={16} />;
      case "meter":
        return <Database className={node.meter?.status === "Active" ? "text-emerald-500" : node.meter?.status === "Faulty" ? "text-red-500" : "text-zinc-500"} size={14} />;
      default:
        return null;
    }
  };

  const getBadgeClass = (status?: string) => {
    if (!status) return "";
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "Faulty":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case "Inactive":
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/10";
      default:
        return "bg-zinc-500/10 text-zinc-400";
    }
  };

  return (
    <div className="select-none">
      <div
        onClick={handleToggle}
        style={{ paddingLeft: `${depth * 16}px` }}
        className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all text-xs ${
          isMeter ? "hover:translate-x-0.5" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          {hasChildren ? (
            <span className="text-zinc-400">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-[14px]" /> // Spacing matching chevron width
          )}
          {getIcon()}
          <span className={`font-medium ${isMeter ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-900 dark:text-white"}`}>
            {node.name}
            {!isMeter && <span className="ml-1 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">({node.type})</span>}
          </span>
        </div>

        {isMeter && node.meter && (
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${getBadgeClass(node.meter.status)}`}>
              {node.meter.status}
            </span>
          </div>
        )}
      </div>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden border-l border-zinc-200/10 dark:border-white/5 ml-[18px] my-0.5"
            >
              {node.children!.map((child, idx) => (
                <TreeNodeItem key={idx} node={child} depth={depth + 1} onSelectMeter={onSelectMeter} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

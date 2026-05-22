"use client";

import { useEffect, useState } from "react";
import AssignmentCard from "@/components/assignment-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TaskStatus = "pending" | "dispatched" | "in_progress" | "validating" | "completed" | "failed";

interface Task {
  id: string;
  type: string;
  assignedAgent: string;
  description: string;
  dependsOn: string[];
  status: TaskStatus;
}

interface Assignment {
  id: string;
  planSummary: string;
  status: string;
  createdAt: string;
  latestActivity?: string | null;
  tasks: Task[];
  qaReport: {
    verdict?: string;
    score?: number;
    issues?: string[];
    summary?: string;
  } | null;
  failureReason: string | null;
}

const AGENTS = [
  { key: "project_manager", label: "PM",      color: "border-purple-700 bg-purple-900/40", active: "border-purple-400 bg-purple-800/60 shadow-purple-900/50" },
  { key: "engineer",        label: "Engineer", color: "border-blue-800 bg-blue-900/40",    active: "border-blue-400 bg-blue-800/60 shadow-blue-900/50" },
  { key: "frontend",        label: "Frontend", color: "border-pink-800 bg-pink-900/40",    active: "border-pink-400 bg-pink-800/60 shadow-pink-900/50" },
  { key: "qa",              label: "QA",       color: "border-yellow-800 bg-yellow-900/40",active: "border-yellow-400 bg-yellow-800/60 shadow-yellow-900/50" },
  { key: "infra",           label: "Infra",    color: "border-green-800 bg-green-900/40",  active: "border-green-400 bg-green-800/60 shadow-green-900/50" },
  { key: "researcher",      label: "Research", color: "border-orange-800 bg-orange-900/40",active: "border-orange-400 bg-orange-800/60 shadow-orange-900/50" },
];

function AgentStatusBar({ assignments }: { assignments: Assignment[] }) {
  const workingAgents: Record<string, string[]> = {};
  for (const a of assignments) {
    for (const t of a.tasks) {
      if (t.status === "in_progress" || t.status === "validating" || t.status === "dispatched") {
        if (!workingAgents[t.assignedAgent]) workingAgents[t.assignedAgent] = [];
        workingAgents[t.assignedAgent].push(t.id.replace(/_/g, " "));
      }
    }
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
      {AGENTS.map((agent) => {
        const tasks = workingAgents[agent.key] || [];
        const isActive = tasks.length > 0;
        return (
          <div
            key={agent.key}
            className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${isActive ? agent.active + " shadow-lg" : agent.color}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse opacity-80" />}
              <span className="text-xs font-semibold text-gray-200">{agent.label}</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">
              {isActive ? tasks[0] : "idle"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "failed" | "completed">("all");

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssignments(data.assignments || []);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Cannot reach Valkey — is VALKEY_URL set?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        setDescription("");
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        fetchAssignments();
      }
    } catch {
      setError("Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    switch (activeFilter) {
      case "active":
        return a.status === "in_progress" || a.tasks.some((t) => ["in_progress", "validating", "dispatched"].includes(t.status));
      case "failed":
        return a.status === "failed" || a.tasks.some((t) => t.status === "failed");
      case "completed":
        return a.status === "completed";
      default:
        return true;
    }
  });

  const totalActive = assignments.filter((a) => a.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Skogum Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalActive > 0
                ? `${totalActive} assignment${totalActive > 1 ? "s" : ""} in progress`
                : "No active assignments"}
              {lastUpdated && ` · updated ${lastUpdated.toLocaleTimeString()}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAssignments} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {/* Assignment Submission Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism rounded-xl p-6 mb-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                New Assignment
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your assignment..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[100px] resize-vertical"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !description.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
            </div>
          </form>
          <AnimatePresence>
            {submitSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center gap-2 text-sm text-green-400"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Assignment submitted successfully!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Agent status bar */}
        {assignments.length > 0 && <AgentStatusBar assignments={assignments} />}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 border-b border-white/10">
            {[
              { key: "all" as const, label: "All" },
              { key: "active" as const, label: "Active" },
              { key: "failed" as const, label: "Failed" },
              { key: "completed" as const, label: "Completed" },
            ].map((tab) => {
              const count = {
                all: assignments.length,
                active: assignments.filter((a) => a.status === "in_progress" || a.tasks.some((t) => ["in_progress", "validating", "dispatched"].includes(t.status))).length,
                failed: assignments.filter((a) => a.status === "failed" || a.tasks.some((t) => t.status === "failed")).length,
                completed: assignments.filter((a) => a.status === "completed").length,
              }[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    activeFilter === tab.key
                      ? "text-blue-300"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                  <span className="text-xs text-gray-500">({count})</span>
                  {activeFilter === tab.key && (
                    <motion.div
                      layoutId="filter-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="text-center py-12 text-red-400 text-sm">{error}</div>
        ) : loading && assignments.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No assignments found.</div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

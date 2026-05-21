"use client";

import { useEffect, useState } from "react";
import { AssignmentCard } from "@/components/assignment-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type TaskStatus = "pending" | "dispatched" | "in_progress" | "validating" | "completed" | "failed";

interface Task {
  id: string;
  type: string;
  assignedAgent: string;
  description: string;
  dependsOn: string[];
  status: TaskStatus;
  completedAt?: string | null;
}

interface Assignment {
  id: string;
  planSummary: string;
  status: string;
  createdAt: string;
  latestActivity?: string | null;
  tasks: Task[];
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

        {/* Agent status bar */}
        {assignments.length > 0 && <AgentStatusBar assignments={assignments} />}

        {/* Content */}
        {error ? (
          <div className="text-center py-12 text-red-400 text-sm">{error}</div>
        ) : loading && assignments.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">No assignments found.</div>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AssignmentCard } from "@/components/assignment-card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Task {
  id: string;
  type: string;
  assignedAgent: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt?: string;
}

interface Assignment {
  id: string;
  planSummary: string;
  status: string;
  createdAt: string;
  tasks: Task[];
}

export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssignments(data.assignments || []);
      setError(null);
    } catch {
      setError("Failed to connect to Valkey. Is VALKEY_URL configured?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Skogum Admin</h1>
            <p className="text-muted-foreground mt-1">Real-time agent activity — auto-refreshes every 5s</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAssignments} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : loading && assignments.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No assignments found.</div>
        ) : (
          <div className="grid gap-6">
            {assignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

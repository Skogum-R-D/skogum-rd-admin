"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";

interface Task {
  id: string;
  type: string;
  assigned_agent: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completed_at?: string;
}

interface Assignment {
  id: string;
  plan_summary: string;
  status: string;
  created_at: string;
  tasks: Task[];
}

export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/assignments");
      const data = await response.json();
      setAssignments(data.assignments);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold gradient-text">Agent Activity Dashboard</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssignments}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {loading && assignments.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No assignments found.
          </div>
        ) : (
          <div className="grid gap-6">
            {assignments.map((assignment) => {
              const completedTasks = assignment.tasks.filter(
                (task) => task.status === "completed"
              ).length;
              const totalTasks = assignment.tasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

              return (
                <Card key={assignment.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Assignment {assignment.id}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.plan_summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(assignment.id)}
                      >
                        {expanded[assignment.id] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-muted-foreground">
                          {completedTasks}/{totalTasks} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <motion.div
                          className="bg-primary h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>

                    {expanded[assignment.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 mt-4">
                          {assignment.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 rounded-lg border border-gray-700 bg-gray-800/50"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-primary">Task {task.id}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {task.type}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Agent: {task.assigned_agent}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                                      task.status
                                    )}`}
                                  >
                                    {task.status}
                                  </span>
                                  {task.completed_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Completed: {new Date(task.completed_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

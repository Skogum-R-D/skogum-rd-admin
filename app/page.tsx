"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface Task {
  id: string;
  type: string;
  agent: string;
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/assignments");
      const data = await response.json();
      setAssignments(data);
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
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold gradient-text">Agent Activity Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssignments}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No assignments found.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="show"
          variants{{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {assignments
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .map((assignment) => {
              const completedTasks = assignment.tasks.filter(
                (t) => t.status === "completed"
              ).length;
              const totalTasks = assignment.tasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

              return (
                <motion.div
                  key={assignment.id}
                  variants{{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                  }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          Assignment {assignment.id}
                        </CardTitle>
                        <Badge variant="secondary">
                          {new Date(assignment.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {assignment.plan_summary}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>
                              {completedTasks}/{totalTasks} tasks
                            </span>
                          </div>
                          <Progress value={progress} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {assignment.tasks.map((task) => (
                            <Badge
                              key={task.id}
                              variant="outline"
                              className={`flex items-center gap-1 ${
                                task.status === "completed" ? "border-green-500 text-green-500" :
                                task.status === "in_progress" ? "border-blue-500 text-blue-500" :
                                task.status === "failed" ? "border-red-500 text-red-500" :
                                "border-gray-500 text-gray-500"
                              }`}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColor(task.status) }}></span>
                              {task.agent}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between"
                          onClick={() => toggleExpand(assignment.id)}
                        >
                          {expanded[assignment.id] ? "Hide Tasks" : "Show Tasks"}
                          {expanded[assignment.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {expanded[assignment.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="space-y-2 overflow-hidden"
                          >
                            {assignment.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${getStatusColor(task.status)}`}
                                  ></span>
                                  <span className="text-xs font-mono">
                                    {task.id}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {task.type}
                                  </span>
                                </div>
                                <span
                                  className={`text-xs font-medium ${
                                    task.status === "completed" ? "text-green-500" :
                                    task.status === "in_progress" ? "text-blue-500" :
                                    task.status === "failed" ? "text-red-500" :
                                    "text-gray-500"
                                  }`}
                                >
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
        </motion.div>
      )}
    </div>
  );
}

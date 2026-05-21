"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock, CheckCircle, AlertCircle, CircleDashed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const completedTasks = assignment.tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const progress = (completedTasks / assignment.tasks.length) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "in_progress":
        return <CircleDashed className="h-4 w-4 text-yellow-400" />;
      default:
        return <CircleDashed className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Assignment {assignment.id}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {assignment.planSummary}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-muted-foreground">
                {completedTasks}/{assignment.tasks.length} tasks
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent>
              <div className="space-y-4">
                {assignment.tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">Task {task.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Agent: {task.assignedAgent}
                      </p>
                      <p className={`text-xs ${
                        task.status === "completed" ? "text-green-400" :
                        task.status === "failed" ? "text-red-400" :
                        task.status === "in_progress" ? "text-yellow-400" : "text-gray-400"
                      }`}>
                        {task.status.replace("_", " ")}
                      </p>
                      {task.completedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.completedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

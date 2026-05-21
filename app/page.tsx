"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

type Task = {
  id: string;
  type: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completed_at?: string;
};

type Assignment = {
  id: string;
  plan_summary: string;
  status: string;
  created_at: string;
  tasks: Task[];
};

export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/assignments');
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
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
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getProgress = (tasks: Task[]) => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { completed, total: tasks.length };
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold gradient-text">Agent Activity Dashboard</h1>
        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </header>

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="show"
        variants{{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No assignments found</p>
            </CardContent>
          </Card>
        ) : (
          assignments
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(assignment => {
              const progress = getProgress(assignment.tasks);
              const isExpanded = expanded[assignment.id];

              return (
                <motion.div key={assignment.id} variants{{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}>
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Assignment {assignment.id}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(assignment.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{assignment.plan_summary}</p>
                    </CardHeader>

                    <CardContent>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{progress.completed}/{progress.total} tasks</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {assignment.tasks.map(task => (
                          <span
                            key={task.id}
                            className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            {task.agent}
                          </span>
                        ))}
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="space-y-3 mt-4 pt-4 border-t border-muted">
                            {assignment.tasks.map(task => (
                              <div key={task.id} className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{task.type}</p>
                                  <p className="text-xs text-muted-foreground">Agent: {task.agent}</p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                      task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                      task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                      'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {task.status}
                                  </span>
                                  {task.completed_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(task.completed_at).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
        )}
      </motion.div>
    </div>
  );
}

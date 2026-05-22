"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Clock, ArrowRight, AlertTriangle } from "lucide-react";

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

interface QAReport {
  verdict: string;
  score: number;
  issues: string[];
  summary: string;
}

interface Assignment {
  id: string;
  planSummary: string;
  status: string;
  createdAt: string;
  latestActivity?: string | null;
  tasks: Task[];
  qaReport?: QAReport | null;
  failureReason?: string | null;
}

const AGENT_META: Record<string, { label: string; color: string; bg: string }> = {
  project_manager: { label: "PM",  color: "text-purple-300", bg: "bg-purple-900/60 border-purple-700" },
  engineer:        { label: "ENG", color: "text-blue-300",   bg: "bg-blue-900/60 border-blue-700" },
  frontend:        { label: "FE",  color: "text-pink-300",   bg: "bg-pink-900/60 border-pink-700" },
  qa:              { label: "QA",  color: "text-yellow-300", bg: "bg-yellow-900/60 border-yellow-700" },
  infra:           { label: "INF", color: "text-green-300",  bg: "bg-green-900/60 border-green-700" },
  researcher:      { label: "RES", color: "text-orange-300", bg: "bg-orange-900/60 border-orange-700" },
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  pending:    { label: "pending",     dot: "bg-gray-500",   text: "text-gray-400",   pulse: false },
  dispatched: { label: "dispatched",  dot: "bg-slate-400",  text: "text-slate-300",  pulse: true  },
  in_progress:{ label: "in progress", dot: "bg-blue-400",   text: "text-blue-300",   pulse: true  },
  validating: { label: "validating",  dot: "bg-yellow-400", text: "text-yellow-300", pulse: true  },
  completed:  { label: "completed",   dot: "bg-green-500",  text: "text-green-400",  pulse: false },
  failed:     { label: "failed",      dot: "bg-red-500",    text: "text-red-400",    pulse: false },
};

function AgentBadge({ agent }: { agent: string }) {
  const meta = AGENT_META[agent] || { label: agent.slice(0,3).toUpperCase(), color: "text-gray-300", bg: "bg-gray-800 border-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold ${meta.color} ${meta.bg}`}>
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? "animate-pulse" : ""}`} />
      {meta.label}
    </span>
  );
}

function fmt(ts: string | null | undefined) {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function HandoffTimeline({ tasks }: { tasks: Task[] }) {
  const events = tasks
    .filter((t) => t.completedAt)
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());
  if (events.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Agent handoff chain</p>
      <div className="flex flex-wrap gap-y-3 items-start">
        {events.map((e, i) => (
          <React.Fragment key={e.id}>
            <div className="flex flex-col items-center gap-0.5">
              <AgentBadge agent={e.assignedAgent} />
              <span className="text-[10px] text-gray-600 font-mono">{fmt(e.completedAt)}</span>
              <span className="text-[10px] text-gray-500 max-w-[72px] text-center leading-tight">{e.id.replace(/_/g, " ")}</span>
            </div>
            {i < events.length - 1 && (
              <ArrowRight className="h-3 w-3 text-gray-600 mx-1 flex-shrink-0 mt-1" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function FailureDetail({ qaReport, failureReason }: { qaReport?: QAReport | null; failureReason?: string | null }) {
  if (!qaReport && !failureReason) return null;

  return (
    <div className="mt-4 p-4 rounded-lg bg-red-950/30 border border-red-900/30">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <h4 className="text-sm font-semibold text-red-300">Failure Details</h4>
      </div>

      {qaReport && (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">QA Score</p>
            <p className="text-lg font-bold text-white">{qaReport.score}/10</p>
          </div>

          {qaReport.issues && qaReport.issues.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Issues</p>
              <ul className="mt-1 space-y-1 text-sm text-gray-300 list-disc list-inside">
                {qaReport.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {qaReport.summary && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Summary</p>
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">{qaReport.summary}</p>
            </div>
          )}
        </div>
      )}

      {failureReason && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Failure Reason</p>
          <p className="mt-1 text-sm text-red-300 font-mono">{failureReason}</p>
        </div>
      )}
    </div>
  );
}

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [showFailureDetails, setShowFailureDetails] = React.useState(false);

  const completed = assignment.tasks.filter((t) => t.status === "completed").length;
  const total = assignment.tasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const active = assignment.tasks.filter(
    (t) => t.status === "in_progress" || t.status === "validating" || t.status === "dispatched"
  );
  const assignmentStatusMeta = STATUS_META[assignment.status as TaskStatus] || STATUS_META.pending;

  const hasFailure = assignment.status === "failed" || assignment.tasks.some((t) => t.status === "failed");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-gray-500">{assignment.id.slice(0, 8)}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${assignmentStatusMeta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${assignmentStatusMeta.dot} ${assignmentStatusMeta.pulse ? "animate-pulse" : ""}`} />
              {assignment.status}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium leading-snug">{assignment.planSummary}</p>
          {assignment.createdAt && (
            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(assignment.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-white">
            {completed}<span className="text-gray-500 text-sm font-normal">/{total}</span>
          </p>
          <p className="text-xs text-gray-500">tasks done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/5 rounded-full h-1.5">
        <motion.div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Active tasks callout */}
      {active.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {active.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-800/50 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <AgentBadge agent={t.assignedAgent} />
              <span className="text-xs text-blue-200">{t.id.replace(/_/g, " ")}</span>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      )}

      {/* Full task list */}
      <div className="space-y-1">
        {assignment.tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 rounded-lg px-3 py-2 ${
              task.status === "in_progress" || task.status === "validating" || task.status === "dispatched"
                ? "bg-blue-950/40 border border-blue-800/30"
                : task.status === "failed"
                ? "bg-red-950/30 border border-red-900/30"
                : "bg-white/[0.02]"
            }`}
          >
            <div className="flex-shrink-0 pt-0.5">
              <AgentBadge agent={task.assignedAgent} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-300">{task.id.replace(/_/g, " ")}</span>
                <span className="text-xs text-gray-600">· {task.type}</span>
                <StatusBadge status={task.status} />
              </div>
              {task.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{task.description}</p>
              )}
            </div>
            {task.completedAt && (
              <span className="flex-shrink-0 text-[10px] text-gray-600 font-mono pt-0.5">{fmt(task.completedAt)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Timeline toggle */}
      {assignment.tasks.some((t) => t.completedAt) && (
        <>
          <button
            onClick={() => setShowTimeline((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showTimeline ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Agent handoff timeline
          </button>
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <HandoffTimeline tasks={assignment.tasks} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Failure details toggle */}
      {hasFailure && (
        <>
          <button
            onClick={() => setShowFailureDetails((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            {showFailureDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Show failure details
          </button>
          <AnimatePresence>
            {showFailureDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <FailureDetail qaReport={assignment.qaReport} failureReason={assignment.failureReason} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

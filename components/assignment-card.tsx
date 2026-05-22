import { motion } from "framer-motion";
import { useState } from "react";

interface AssignmentCardProps {
  assignment: {
    id: string;
    plan: string;
    status: string;
    tasks: Array<{
      id: string;
      status: string;
      description: string;
    }>;
    qaReport: {
      verdict?: string;
      score?: number;
      issues?: string[];
      summary?: string;
    } | null;
    failureReason: string | null;
  };
}

export default function AssignmentCard({ assignment }: AssignmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasFailure = assignment.status === "failed" ||
    assignment.tasks.some(task => task.status.startsWith("failed"));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-4"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">
            {assignment.plan}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Status: <span className={`font-medium ${
              assignment.status === "completed" ? "text-green-400" :
              assignment.status === "failed" ? "text-red-400" :
              "text-blue-400"
            }`}>
              {assignment.status}
            </span>
          </p>
        </div>
        {hasFailure && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            {isExpanded ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>

      {isExpanded && hasFailure && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 p-3 bg-red-950/30 border border-red-900/30 rounded-md"
        >
          <h4 className="text-red-300 font-medium mb-2">Failure Details</h4>
          {assignment.qaReport?.score !== undefined && (
            <p className="text-red-200 mb-2">
              QA Score: <span className="font-bold">{assignment.qaReport.score}/10</span>
            </p>
          )}
          {assignment.qaReport?.issues && assignment.qaReport.issues.length > 0 && (
            <div className="text-red-200 mb-2">
              <h5 className="font-medium">Issues:</h5>
              <ul className="list-disc list-inside">
                {assignment.qaReport.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {assignment.qaReport?.summary && (
            <p className="text-red-200 text-sm">
              {assignment.qaReport.summary}
            </p>
          )}
          {assignment.failureReason && (
            <p className="text-red-200 text-sm mt-2">
              <strong>Reason:</strong> {assignment.failureReason}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
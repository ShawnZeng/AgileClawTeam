"use client";

import type { Task, AgentState } from "@/lib/types";

const STATUS_CONFIG: Record<Task["status"], { label: string; color: string }> =
  {
    pending: { label: "待处理", color: "bg-gray-700 text-gray-300" },
    "in-progress": { label: "进行中", color: "bg-blue-900 text-blue-300" },
    working: { label: "进行中", color: "bg-blue-900 text-blue-300" },
    done: { label: "完成", color: "bg-green-900 text-green-300" },
    blocked: { label: "阻塞", color: "bg-red-900 text-red-300" },
  };

const TYPE_ICON: Record<Task["type"], string> = {
  development: "💻",
  design: "🎨",
  testing: "🔍",
  other: "📝",
};

function TaskRow({
  task,
  allTasks,
  agents,
}: {
  task: Task;
  allTasks: Task[];
  agents: AgentState[];
}) {
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const assignee = agents.find((a) => a.id === task.assigneeId);
  const depTasks = task.dependencies
    .map((id) => allTasks.find((t) => t.id === id))
    .filter(Boolean) as Task[];
  const depsBlocking = depTasks.some((d) => d.status !== "done");

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{TYPE_ICON[task.type]}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">
              {task.title}
            </div>
            <div className="text-xs text-gray-500 font-mono">{task.id}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {assignee && (
            <span className="text-xs text-purple-400">{assignee.id}</span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>
      </div>
      {task.dependencies.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.dependencies.map((depId) => {
            const dep = allTasks.find((t) => t.id === depId);
            return (
              <span
                key={depId}
                className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  dep?.status === "done"
                    ? "bg-green-900 text-green-400"
                    : "bg-red-900 text-red-400"
                }`}
              >
                ↑ {depId}
              </span>
            );
          })}
          {depsBlocking && (
            <span className="text-xs text-yellow-500 ml-1">⚠ 依赖未完成</span>
          )}
        </div>
      )}
      {task.blockerDescription && (
        <div
          className="mt-1 text-xs text-red-400 truncate"
          title={task.blockerDescription}
        >
          ⛔ {task.blockerDescription}
        </div>
      )}
    </div>
  );
}

export default function TaskBoard({
  tasks,
  agents,
}: {
  tasks: Task[];
  agents: AgentState[];
}) {
  const byStatus: Record<Task["status"], Task[]> = {
    pending: [],
    "in-progress": [],
    working: [],
    done: [],
    blocked: [],
  };
  for (const task of tasks) {
    byStatus[task.status].push(task);
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Sprint Tasks ({tasks.length})
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {(
          ["pending", "in-progress", "blocked", "done"] as Task["status"][]
        ).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const statusTasks = byStatus[status];
          return (
            <div key={status}>
              <div
                className={`text-xs font-medium mb-2 ${cfg.color.replace("bg-", "text-").replace("-900", "-400")}`}
              >
                {cfg.label} ({statusTasks.length})
              </div>
              <div className="space-y-2">
                {statusTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    agents={agents}
                  />
                ))}
                {statusTasks.length === 0 && (
                  <div className="text-xs text-gray-700 text-center py-4 border border-dashed border-gray-800 rounded-lg">
                    暂无
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

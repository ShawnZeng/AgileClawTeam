# SM Agent 行为指令

## ⚠️ sessions_send 正确用法

**必须携带 `label` 参数，否则调用失败：**

```
# 分配任务给团队成员（label = 任务ID，可追溯）
sessions_send({
  agentId: "developer-1",
  label: "TASK-001",
  message: "分配任务 TASK-001：[任务标题]\n详情：[description]\n请执行并完成后汇报。"
})

# 通知 PO（label = 主题）
sessions_send({
  agentId: "po",
  label: "sprint-status",
  message: "[通知内容]"
})
```

---

## Sprint 规划算法

收到 PO 通知（或自主检测到未规划 Item）时：

1. 读取 `../workspace-po/state/backlog.json` → 筛选 `sprintId=null` 且 `status≠done` 的 Item
2. 读取 `state/sprint.json` → 确认无 `status=planning` 或 `status=execution` 的活跃 Sprint
3. 按优先级升序（priority 数值小=高优先）排列，选取前 1–3 个 Item
4. 生成 Sprint，写入 `state/sprint.json`
5. 通知 PO：`sessions_send({ agentId: "po", label: "sprint-status", message: "SM通知：已启动 SPRINT-XXX，承诺事项：[列表]" })`
6. 在 agents.json 中更新自身状态：`lastMessage: "正在规划 SPRINT-XXX，分解任务"`, `talkingTo: null`
7. 进入任务分解

## 任务分解算法

1. 读取 `../workspace-po/state/backlog.json` 确认 Item 详情
2. 对每个承诺的 Item，分解为：设计任务 → 开发任务 → 测试任务
3. 建立依存关系，写入 `state/tasks.json`

## Agent 任务分配

团队注册成员：`designer-1`、`developer-1`、`developer-2`、`tester-1`

**每次分配任务，必须同时：**

**① 发送任务消息（label = 任务ID）：**

```
sessions_send({
  agentId: "developer-1",
  label: "TASK-001",
  message: "分配任务 TASK-001：[任务标题]\n详情：[description]\n依存：[dependencies]\n请执行并完成后汇报。"
})
```

**② 更新 agents.json（SM 自身 + 被分配的成员）：**

```json
// SM 自身状态
{ "id": "sm", "status": "working", "talkingTo": "developer-1",
  "lastMessage": "向 developer-1 分配 TASK-001：[任务标题]" }

// developer-1 状态
{ "id": "developer-1", "role": "developer", "status": "working",
  "currentTaskId": "TASK-001", "talkingTo": "sm",
  "lastActivity": "ISO时间", "lastMessage": "接收 TASK-001 分配" }
```

同理向 `designer-1`（设计任务）、`developer-2`（并行开发任务）、`tester-1`（测试任务）分配。

补充规则：`talkingTo` 只在最近这一轮真实收发消息期间保留。任务派发消息成功后，如果 SM 后续只是在内部读文件、规划、调用工具，不再与对方继续收发消息，则应尽快把自身 `talkingTo` 清为 `null`；成员侧完成汇报消息发出后也应将 `talkingTo` 清为 `null`。

## 巡检流程（自动触发）

```
【第 0 步 — 待机检测，必须首先执行，任何情况不得跳过】

读取 ../workspace-po/state/backlog.json
读取 state/sprint.json（文件不存在则视为无 Sprint）

如果同时满足以下全部条件：
  ① backlog 中不存在 sprintId=null 且 status≠done 的 Item（无待分配的新工作）
  ② 没有 status 为 planning 或 execution 的活跃 Sprint

则执行以下步骤后立即结束，不执行后续任何步骤：

  A. 删除巡检 cron（彻底停止周期性 cron 触发）：
     1. 调用 cron({ action: "cron.list" }) → 列出所有 cron 任务
     2. 找到 label 含 "Sprint Inspection" 的任务，获取其 id
     3. 若找到：调用 cron({ action: "cron.remove", id: "<cronId>" }) 删除它
        若未找到：跳过（已被删除或从未创建）

  B. 更新 state/agents.json 自身条目：
     { "id": "sm", "status": "idle", "talkingTo": null,
       "lastMessage": "所有 Sprint 已完成，巡检 cron 已停止，等待新需求" }

  C. 输出日志："待机：已删除巡检 cron，等待 PO 分配新工作"

  D. 立即结束

---

【第 0b 步 — 待机恢复（仅在通过 sessions_send 直接收到 PO 消息时执行）】

1. 读取 backlog.json → 检查是否有 sprintId=null 且 status≠done 的 Item
2. 如有新工作：
   a. 调用 cron({ action: "cron.add", schedule: { expr: "*/10 * * * *" }, label: "Sprint Inspection" })
      重新创建巡检 cron
   b. 继续执行第 1 步及后续正常巡检流程
3. 如无新工作：
   回复 PO "当前无待处理工作，如有新需求请更新 backlog"，结束

---

1. 读取 ../workspace-po/state/backlog.json → 检查是否有 sprintId=null 且 status≠done 的 Item
   → 如有，且无活跃 Sprint → 执行 Sprint 规划算法
2. 读取 state/tasks.json → 找到 status=pending 且 dependencies 全部 done 的 Task
3. 读取 state/agents.json → 找到 status=idle 的 Agent
4. 匹配分配（type 匹配 role），携带 label=任务ID 发送
5. 若有 status=blocked 的 Agent → 检查 blockerDescription → 创建辅助 Task
6. 检查 Sprint 完成度：若所有 committedItemIds 对应的 Task 全部 done → 触发 Sprint Review
```

## Sprint Review 触发

1. `sessions_send({ agentId: "po", label: "sprint-status", message: "SM通知：本次 Sprint 所有任务已完成，请进行评审。\n[完成任务清单]" })`
2. 等待 PO 评审结果
3. Item 未达成 → 在 tasks.json 中补充缺失 Task

## Retrospective 流程（全员参与）

Sprint 完成后，**不含 PO**，向所有团队成员发起回顾：

**1. 向全员发起（均用 label="retrospective"）：**

```
sessions_send({ agentId: "designer-1",  label: "retrospective", message: "Sprint 回顾：请分享 keep（做得好的）、drop（要停止的）、puzzle（困惑的）。" })
sessions_send({ agentId: "developer-1", label: "retrospective", message: "Sprint 回顾：请分享 keep、drop、puzzle。" })
sessions_send({ agentId: "developer-2", label: "retrospective", message: "Sprint 回顾：请分享 keep、drop、puzzle。" })
sessions_send({ agentId: "tester-1",    label: "retrospective", message: "Sprint 回顾：请分享 keep、drop、puzzle。" })
```

在 agents.json 中：`lastMessage: "向全员收集 Sprint 回顾反馈"`, `talkingTo: null`

**2. 汇总反馈写入 sprint.json.retrospective**

**3. 提炼经验，追加写入 `state/TEAM_MEMORY.md`：**

```markdown
## Sprint N 经验总结（YYYY-MM-DD）

**做得好的：**

- [keep 要点]

**需要改进的：**

- [drop 要点]

**未解决困惑：**

- [puzzle 要点]

**下次关注：**

- [可操作改进点]
```

**4. 通知 PO 回顾完成：**

```
sessions_send({ agentId: "po", label: "sprint-status",
  message: "Sprint 回顾会已完成，经验已汇总至团队记忆文件。" })
```

**5. 标记 sprint.json → status = "done"，写入 `endedAt`**

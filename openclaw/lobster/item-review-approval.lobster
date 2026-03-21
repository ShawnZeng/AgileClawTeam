name: item-review-approval
description: "PO 对 Sprint 成果进行交互式审批"

args:
  sprint_id:
    description: "要审批的 Sprint ID"
    default: ""

steps:
  - id: prepare_summary
    description: "生成 Sprint 摘要"
    command: node ../scripts/generate-sprint-summary.js --sprint {sprint_id}

  - id: notify_po
    description: "通知 PO 审批，等待回复"
    command: >
      openclaw agent send po
      "Sprint {sprint_id} Review 准备就绪。以下是本次迭代完成情况报告：

      {prepare_summary.stdout}

      请对每个 Item 回复：APPROVE [ITEM-ID] 或 REJECT [ITEM-ID] [原因]"
    approval: true

  - id: update_items
    description: "根据 PO 回复更新 BacklogItem 状态"
    command: node ../scripts/apply-review-results.js --sprint {sprint_id}
    stdin: "{notify_po.response}"

name: boss-review
description: "PO 向老板展示成果并等待验收"

args:
  sprint_id:
    description: "Sprint ID"
    default: ""
  items_summary:
    description: "本次迭代完成的 Item 摘要"
    default: ""

steps:
  - id: prepare_demo
    description: "准备展示材料"
    command: node ../scripts/generate-sprint-summary.js --sprint {sprint_id} --for-boss

  - id: present_to_boss
    description: "向老板展示，等待反馈"
    command: >
      openclaw agent send po
      "老板，Sprint {sprint_id} 已完成。请查看本次成果：

      {prepare_demo.stdout}

      请验收并回复：ACCEPT（接受）或说明需要改进的地方"
    approval: true

  - id: handle_feedback
    description: "处理老板反馈"
    command: node ../scripts/apply-boss-feedback.js --sprint {sprint_id}
    stdin: "{present_to_boss.response}"

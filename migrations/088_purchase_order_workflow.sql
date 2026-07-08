-- NVX-P0: Workflow phê duyệt đơn mua (PO)
-- Seed system workflow purchase_order_approve (mirrors pos_discount_override pattern)

INSERT INTO kit_workflow.workflow_definition (
    workflow_code, workflow_name, entity_type, description, version_no, is_system
)
SELECT
    'purchase_order_approve',
    'Purchase Order Approval',
    'purchase_order',
    'Manager approval before PO moves from Draft to Approved',
    1,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM kit_workflow.workflow_definition w
    WHERE w.tenant_id IS NULL AND w.workflow_code = 'purchase_order_approve' AND w.deleted_at IS NULL
);

INSERT INTO kit_workflow.workflow_step (tenant_id, workflow_id, step_code, step_name, step_type, assignee_type, assignee_ref, sort_order)
SELECT NULL, w.id, s.code, s.name, s.stype, s.atype, s.aref, s.ord
FROM kit_workflow.workflow_definition w
CROSS JOIN (
    VALUES
        ('start', 'Start', 'start', 'system', NULL, 10),
        ('manager_approve', 'Manager Approval', 'approval', 'role', 'ADMIN', 20),
        ('end', 'End', 'end', 'system', NULL, 30)
) AS s(code, name, stype, atype, aref, ord)
WHERE w.workflow_code = 'purchase_order_approve' AND w.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_workflow.workflow_step ws
      WHERE ws.workflow_id = w.id AND ws.step_code = s.code
  );

INSERT INTO kit_workflow.workflow_transition (
    tenant_id, workflow_id, from_step_id, to_step_id, transition_code, transition_name, sort_order
)
SELECT NULL, w.id, fs.id, ts.id, t.code, t.name, t.ord
FROM kit_workflow.workflow_definition w
JOIN (
    VALUES
        ('start_to_approve', 'Submit', 'start', 'manager_approve', 10),
        ('approve_to_end', 'Approve', 'manager_approve', 'end', 20)
) AS t(code, name, from_code, to_code, ord) ON TRUE
JOIN kit_workflow.workflow_step fs ON fs.workflow_id = w.id AND fs.step_code = t.from_code
JOIN kit_workflow.workflow_step ts ON ts.workflow_id = w.id AND ts.step_code = t.to_code
WHERE w.workflow_code = 'purchase_order_approve' AND w.tenant_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM kit_workflow.workflow_transition wt
      WHERE wt.workflow_id = w.id AND wt.transition_code = t.code
  );

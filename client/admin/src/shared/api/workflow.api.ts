import { http } from '@/shared/api/http';

export type WorkflowTaskListItem = {
  taskId: string;
  instanceId: string;
  taskStatus: string;
  decision?: string;
  createdAt: string;
  summary?: string;
};

function normalizeTask(row: Record<string, unknown>): WorkflowTaskListItem {
  return {
    taskId: String(row.taskId ?? row.TaskId),
    instanceId: String(row.instanceId ?? row.InstanceId),
    taskStatus: String(row.taskStatus ?? row.TaskStatus),
    decision: (row.decision ?? row.Decision) as string | undefined,
    createdAt: String(row.createdAt ?? row.CreatedAt),
    summary: (row.summary ?? row.Summary) as string | undefined,
  };
}

export async function fetchPendingPurchaseOrderWorkflowTasks(): Promise<WorkflowTaskListItem[]> {
  const { data } = await http.get<Record<string, unknown>[]>('/system/workflow/purchase-order/pending');
  return (data ?? []).map(normalizeTask);
}

export async function decidePurchaseOrderWorkflowTask(
  taskId: string,
  approved: boolean,
  notes?: string,
): Promise<void> {
  await http.post(`/procurement/purchase-orders/workflow/tasks/${taskId}/decide`, {
    approved,
    notes,
  });
}

import {
  fetchLearningProgram,
  type LearningModuleListItem,
} from '@/shared/api/learning.api';

export type ModuleNeighbor = Pick<LearningModuleListItem, 'id' | 'title' | 'levelCode' | 'sortOrder'>;

export type ModuleNeighbors = {
  prev: ModuleNeighbor | null;
  next: ModuleNeighbor | null;
  index: number;
  total: number;
};

/** Prev/next trong cùng chương trình (theo sortOrder). */
export async function resolveModuleNeighbors(
  programId: string,
  moduleId: string,
): Promise<ModuleNeighbors> {
  const program = await fetchLearningProgram(programId);
  const sorted = [...program.modules].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'vi'),
  );
  const index = sorted.findIndex((m) => m.id === moduleId);
  if (index < 0) {
    return { prev: null, next: null, index: -1, total: sorted.length };
  }
  const toNeighbor = (m: LearningModuleListItem): ModuleNeighbor => ({
    id: m.id,
    title: m.title,
    levelCode: m.levelCode,
    sortOrder: m.sortOrder,
  });
  return {
    prev: index > 0 ? toNeighbor(sorted[index - 1]!) : null,
    next: index < sorted.length - 1 ? toNeighbor(sorted[index + 1]!) : null,
    index,
    total: sorted.length,
  };
}

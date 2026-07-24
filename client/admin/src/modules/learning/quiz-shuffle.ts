/** Shuffle quiz questions + options for practice / monthly drill. */

export type QuizQuestionLike = {
  id: string;
  prompt: string;
  options: string[];
  sortOrder?: number;
  moduleTitle?: string;
  levelCode?: string;
};

export type ShuffledQuizQuestion = QuizQuestionLike & {
  /** displayIndex -> originalOptionIndex */
  optionMap: number[];
};

function fisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function shuffleQuizForPractice(questions: QuizQuestionLike[]): ShuffledQuizQuestion[] {
  return fisherYates(questions).map((q) => {
    const indices = fisherYates(q.options.map((_, i) => i));
    return {
      ...q,
      options: indices.map((i) => q.options[i] ?? ''),
      optionMap: indices,
    };
  });
}

export function mapPracticeAnswersToOriginal(
  original: QuizQuestionLike[],
  shuffled: ShuffledQuizQuestion[],
  displayAnswers: number[],
): number[] {
  const byId = new Map(original.map((q, i) => [q.id, i] as const));
  const result = original.map(() => -1);
  shuffled.forEach((q, i) => {
    const origIdx = byId.get(q.id);
    if (origIdx == null) return;
    const display = displayAnswers[i] ?? -1;
    result[origIdx] = display >= 0 ? (q.optionMap[display] ?? -1) : -1;
  });
  return result;
}

export function mapDrillAnswersToOriginal(
  shuffled: ShuffledQuizQuestion[],
  displayAnswers: number[],
): { questionId: string; selectedIndex: number }[] {
  return shuffled.map((q, i) => {
    const display = displayAnswers[i] ?? -1;
    return {
      questionId: q.id,
      selectedIndex: display >= 0 ? (q.optionMap[display] ?? -1) : -1,
    };
  });
}

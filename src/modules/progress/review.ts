export type ReviewGrade = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export function nextReview(
  intervalDays: number,
  ease: number,
  grade: ReviewGrade,
  now = new Date(),
) {
  const currentInterval = Math.max(1, Math.round(intervalDays));
  const currentEase = Math.min(3, Math.max(1.3, ease));
  let nextInterval = currentInterval;
  let nextEase = currentEase;

  if (grade === 'AGAIN') {
    nextInterval = 1;
    nextEase = Math.max(1.3, currentEase - 0.2);
  } else if (grade === 'HARD') {
    nextInterval = Math.max(1, Math.round(currentInterval * 1.2));
    nextEase = Math.max(1.3, currentEase - 0.15);
  } else if (grade === 'GOOD') {
    nextInterval = Math.max(2, Math.round(currentInterval * currentEase));
  } else {
    nextInterval = Math.max(4, Math.round(currentInterval * currentEase * 1.3));
    nextEase = Math.min(3, currentEase + 0.15);
  }

  return {
    intervalDays: nextInterval,
    ease: Number(nextEase.toFixed(2)),
    dueAt: new Date(now.getTime() + nextInterval * 86_400_000),
  };
}

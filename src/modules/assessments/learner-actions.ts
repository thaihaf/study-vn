'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getAIProvider } from '@/modules/ai/provider';
import { grade } from '@/modules/assessments/grading';
import { requireUser } from '@/modules/auth/session';
import { db } from '@/lib/db';

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function startAssessment(form: FormData) {
  const user = await requireUser();
  const id = z.string().parse(form.get('assessmentId'));
  const assessment = await db.assessment.findFirst({
    where: { id, published: true },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: {
          question: { include: { choices: { orderBy: { position: 'asc' } } } },
        },
      },
    },
  });
  if (!assessment) throw new Error('NOT_FOUND');

  const count = await db.assessmentAttempt.count({
    where: { userId: user.id, assessmentId: id },
  });
  if (assessment.maximumAttempts && count >= assessment.maximumAttempts)
    throw new Error('MAX_ATTEMPTS');

  const questionRows = assessment.randomizeQuestions
    ? shuffle(assessment.questions)
    : assessment.questions;
  const attempt = await db.assessmentAttempt.create({
    data: {
      assessmentId: id,
      userId: user.id,
      snapshots: {
        create: questionRows.map((assessmentQuestion, position) => {
          const question = assessmentQuestion.question;
          const sourceChoices = assessment.randomizeChoices
            ? shuffle(question.choices)
            : question.choices;
          const correctAnswer =
            question.type === 'MULTIPLE_CHOICE'
              ? question.choices
                  .filter((choice) => choice.isCorrect)
                  .map((choice) => choice.id)
              : question.type === 'SHORT_TEXT' ||
                  ['ESSAY', 'CODE_REVIEW', 'SCENARIO'].includes(question.type)
                ? (question.referenceAnswer ?? '')
                : (question.choices.find((choice) => choice.isCorrect)?.id ??
                  '');
          return {
            questionId: question.id,
            prompt: question.prompt,
            type: question.type,
            choicesJson: sourceChoices.map((choice) => ({
              id: choice.id,
              text: choice.text,
            })),
            rubricJson: question.rubricJson ?? undefined,
            explanation: question.explanation,
            correctAnswerJson: asJson(correctAnswer),
            position,
          };
        }),
      },
    },
  });
  redirect(`/assessments/${id}?attempt=${attempt.id}`);
}

export async function submitAssessment(form: FormData) {
  const user = await requireUser();
  const attemptId = z.string().parse(form.get('attemptId'));
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: 'IN_PROGRESS' },
    include: { snapshots: true },
  });
  if (!attempt) throw new Error('NOT_FOUND');

  let correct = 0;
  let graded = 0;
  const results: Array<{ questionId: string; result: boolean | null }> = [];

  await db.$transaction(async (transaction) => {
    for (const snapshot of attempt.snapshots) {
      const fieldName = `answer_${snapshot.id}`;
      const answer =
        snapshot.type === 'MULTIPLE_CHOICE'
          ? form
              .getAll(fieldName)
              .filter((value): value is string => typeof value === 'string')
          : String(form.get(fieldName) ?? '');
      const result = grade(
        { type: snapshot.type, correctAnswerJson: snapshot.correctAnswerJson },
        answer,
      );
      results.push({ questionId: snapshot.questionId, result });
      if (result !== null) {
        graded += 1;
        if (result) correct += 1;
      }
      await transaction.attemptAnswer.create({
        data: {
          attemptId,
          snapshotId: snapshot.id,
          answerJson: asJson(answer),
          isCorrect: result,
          pointsAwarded: result === true ? 1 : result === false ? 0 : null,
        },
      });
    }

    await transaction.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'GRADED',
        score: graded ? Math.round((correct / graded) * 100) : null,
        submittedAt: new Date(),
      },
    });

    const questions = await transaction.question.findMany({
      where: { id: { in: results.map((item) => item.questionId) } },
      select: { id: true, topicId: true },
    });
    const byId = new Map(questions.map((question) => [question.id, question]));
    for (const item of results) {
      const question = byId.get(item.questionId);
      if (item.result === null || !question?.topicId) continue;
      const previous = await transaction.topicProficiency.findUnique({
        where: {
          userId_topicId: { userId: user.id, topicId: question.topicId },
        },
      });
      const nextCorrect = (previous?.correct ?? 0) + (item.result ? 1 : 0);
      const nextTotal = (previous?.total ?? 0) + 1;
      await transaction.topicProficiency.upsert({
        where: {
          userId_topicId: { userId: user.id, topicId: question.topicId },
        },
        create: {
          userId: user.id,
          topicId: question.topicId,
          correct: nextCorrect,
          total: nextTotal,
          score: (nextCorrect / nextTotal) * 100,
        },
        update: {
          correct: nextCorrect,
          total: nextTotal,
          score: (nextCorrect / nextTotal) * 100,
        },
      });
      if (!item.result) {
        await transaction.reviewItem.upsert({
          where: {
            userId_questionId: { userId: user.id, questionId: item.questionId },
          },
          create: {
            userId: user.id,
            questionId: item.questionId,
            dueAt: new Date(),
          },
          update: { dueAt: new Date(), intervalDays: 1 },
        });
      }
    }
  });

  redirect(`/attempts/${attemptId}/result`);
}

export async function requestPracticeFeedback(form: FormData) {
  const user = await requireUser();
  const answerId = z.string().parse(form.get('answerId'));
  const answer = await db.attemptAnswer.findFirst({
    where: { id: answerId, attempt: { userId: user.id } },
    include: { attempt: { include: { snapshots: true } } },
  });
  if (!answer) throw new Error('NOT_FOUND');
  const snapshot = answer.attempt.snapshots.find(
    (item) => item.id === answer.snapshotId,
  );
  if (
    !snapshot ||
    !['ESSAY', 'CODE_REVIEW', 'SCENARIO'].includes(snapshot.type)
  )
    throw new Error('FEEDBACK_NOT_SUPPORTED');

  const prompt = [
    `Câu hỏi: ${snapshot.prompt}`,
    `Rubric: ${JSON.stringify(snapshot.rubricJson ?? {})}`,
    `Câu trả lời người học: ${JSON.stringify(answer.answerJson)}`,
    `Đáp án tham khảo: ${JSON.stringify(snapshot.correctAnswerJson)}`,
    'Hãy phản hồi cụ thể theo rubric; không đưa ra kết luận chính thức.',
  ].join('\n\n');
  const provider = getAIProvider();
  const feedback =
    snapshot.type === 'SCENARIO'
      ? await provider.evaluateInterviewAnswer({
          prompt,
          language: 'vi',
          sources: [],
        })
      : await provider.evaluateEssay({ prompt, language: 'vi', sources: [] });
  await db.attemptAnswer.update({
    where: { id: answer.id },
    data: { feedbackJson: asJson(feedback) },
  });
  revalidatePath(`/attempts/${answer.attemptId}/result`);
}

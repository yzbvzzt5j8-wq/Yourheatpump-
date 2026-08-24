import { db } from './schema';
import type { Survey } from '../types/survey';

export async function getSurveyForJob(jobId: string): Promise<Survey | undefined> {
  return db.surveys.where('jobId').equals(jobId).first();
}

export async function saveSurvey(survey: Survey): Promise<void> {
  await db.surveys.put(survey);
}

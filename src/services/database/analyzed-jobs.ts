/**
 * Analyzed Jobs Database Service
 * Handles all analyzed job-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { AnalyzedJob, CoverLetter, PhoneScreenPrep, TechnicalInterviewPrep, ApplicationStrategy, SkillsRoadmap, ApplicationQuestionAnswer, TopicDetails, AnalyzedJobType } from '@/src/types';
import type { AnalyzedJobRow, Json } from '@/src/lib/supabase/types';
import { generateId } from '@/src/lib/utils';

// Type converter
function rowToAnalyzedJob(row: AnalyzedJobRow): AnalyzedJob {
  return {
    id: row.id,
    jobDescription: row.job_description,
    type: row.type as AnalyzedJobType,
    company: row.company || undefined,
    role: row.role || undefined,
    location: row.location || undefined,
    salaryRange: row.salary_range || undefined,
    source: row.source || undefined,
    jobUrl: row.job_url || undefined,
    analysis: row.analysis as unknown as AnalyzedJob['analysis'],
    coverLetters: (row.cover_letters as unknown as CoverLetter[]) || [],
    phoneScreenPrep: (row.phone_screen_prep as unknown as PhoneScreenPrep) || undefined,
    technicalInterviewPrep: (row.technical_interview_prep as unknown as TechnicalInterviewPrep) || undefined,
    applicationStrategy: (row.application_strategy as unknown as ApplicationStrategy) || undefined,
    skillsRoadmap: (row.skills_roadmap as unknown as SkillsRoadmap) || undefined,
    screeningQuestions: (row.screening_questions as unknown as AnalyzedJob['screeningQuestions']) || [],
    applicationQuestions: (row.application_questions as unknown as ApplicationQuestionAnswer[]) || [],
    applicationId: row.application_id || undefined,
    isFavorite: row.is_favorite,
    notes: row.notes || undefined,
    tags: row.tags || [],
    profileId: row.profile_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const analyzedJobsService = {
  /**
   * Fetch all analyzed jobs for the current user
   */
  async list(): Promise<AnalyzedJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('analyzed_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToAnalyzedJob);
  },

  /**
   * Get jobs for a specific profile
   */
  async listByProfile(profileId: string): Promise<AnalyzedJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('analyzed_jobs')
      .select('*')
      .eq('user_id', user.id)
      .or(`profile_id.eq.${profileId},profile_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToAnalyzedJob);
  },

  /**
   * Get a single job by ID
   */
  async get(id: string): Promise<AnalyzedJob | null> {
    const { data, error } = await from('analyzed_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return rowToAnalyzedJob(data);
  },

  /**
   * Create a new analyzed job
   */
  async create(job: Partial<AnalyzedJob>, profileId?: string): Promise<AnalyzedJob> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const row = {
      user_id: user.id,
      profile_id: profileId || job.profileId || null,
      application_id: job.applicationId || null,
      job_description: job.jobDescription || '',
      type: (job.type || 'fulltime') as 'fulltime' | 'freelance' | 'contract',
      company: job.company || null,
      role: job.role || null,
      location: job.location || null,
      salary_range: job.salaryRange || null,
      source: job.source || null,
      job_url: job.jobUrl || null,
      analysis: job.analysis as unknown as Json,
      cover_letters: (job.coverLetters || []) as unknown as Json,
      phone_screen_prep: (job.phoneScreenPrep || null) as unknown as Json,
      technical_interview_prep: (job.technicalInterviewPrep || null) as unknown as Json,
      application_strategy: (job.applicationStrategy || null) as unknown as Json,
      skills_roadmap: (job.skillsRoadmap || null) as unknown as Json,
      screening_questions: (job.screeningQuestions || []) as unknown as Json,
      application_questions: (job.applicationQuestions || []) as unknown as Json,
      is_favorite: job.isFavorite || false,
      notes: job.notes || null,
      tags: job.tags || [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await from('analyzed_jobs')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return rowToAnalyzedJob(data);
  },

  /**
   * Update an existing analyzed job
   */
  async update(id: string, updates: Partial<AnalyzedJob>): Promise<AnalyzedJob> {
    const updateData: Record<string, unknown> = {};

    if (updates.jobDescription !== undefined) updateData.job_description = updates.jobDescription;
    if (updates.type !== undefined) updateData.type = updates.type as 'fulltime' | 'freelance' | 'contract';
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.salaryRange !== undefined) updateData.salary_range = updates.salaryRange;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.jobUrl !== undefined) updateData.job_url = updates.jobUrl;
    if (updates.analysis !== undefined) updateData.analysis = updates.analysis as unknown as Json;
    if (updates.coverLetters !== undefined) updateData.cover_letters = updates.coverLetters as unknown as Json;
    if (updates.phoneScreenPrep !== undefined) updateData.phone_screen_prep = updates.phoneScreenPrep as unknown as Json;
    if (updates.technicalInterviewPrep !== undefined) updateData.technical_interview_prep = updates.technicalInterviewPrep as unknown as Json;
    if (updates.applicationStrategy !== undefined) updateData.application_strategy = updates.applicationStrategy as unknown as Json;
    if (updates.skillsRoadmap !== undefined) updateData.skills_roadmap = updates.skillsRoadmap as unknown as Json;
    if (updates.screeningQuestions !== undefined) updateData.screening_questions = updates.screeningQuestions as unknown as Json;
    if (updates.applicationQuestions !== undefined) updateData.application_questions = updates.applicationQuestions as unknown as Json;
    if (updates.applicationId !== undefined) updateData.application_id = updates.applicationId;
    if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.profileId !== undefined) updateData.profile_id = updates.profileId;

    const { data, error } = await from('analyzed_jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToAnalyzedJob(data);
  },

  /**
   * Delete an analyzed job
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('analyzed_jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Add a cover letter
   */
  async addCoverLetter(jobId: string, coverLetter: Omit<CoverLetter, 'id'>): Promise<void> {
    const job = await this.get(jobId);
    if (!job) throw new Error('Job not found');

    const newCoverLetter: CoverLetter = {
      ...coverLetter,
      id: generateId(),
    };

    await this.update(jobId, {
      coverLetters: [...job.coverLetters, newCoverLetter],
    });
  },

  /**
   * Update a cover letter
   */
  async updateCoverLetter(jobId: string, coverLetterId: string, updates: Partial<CoverLetter>): Promise<void> {
    const job = await this.get(jobId);
    if (!job) throw new Error('Job not found');

    const updatedCoverLetters = job.coverLetters.map((cl) =>
      cl.id === coverLetterId
        ? { ...cl, ...updates, editedAt: new Date().toISOString() }
        : cl
    );

    await this.update(jobId, { coverLetters: updatedCoverLetters });
  },

  /**
   * Delete a cover letter
   */
  async deleteCoverLetter(jobId: string, coverLetterId: string): Promise<void> {
    const job = await this.get(jobId);
    if (!job) throw new Error('Job not found');

    await this.update(jobId, {
      coverLetters: job.coverLetters.filter((cl) => cl.id !== coverLetterId),
    });
  },

  /**
   * Set phone screen prep
   */
  async setPhoneScreenPrep(jobId: string, prep: PhoneScreenPrep): Promise<void> {
    await this.update(jobId, { phoneScreenPrep: prep });
  },

  /**
   * Set technical interview prep
   */
  async setTechnicalInterviewPrep(jobId: string, prep: TechnicalInterviewPrep): Promise<void> {
    await this.update(jobId, { technicalInterviewPrep: prep });
  },

  /**
   * Set application strategy
   */
  async setApplicationStrategy(jobId: string, strategy: ApplicationStrategy): Promise<void> {
    await this.update(jobId, { applicationStrategy: strategy });
  },

  /**
   * Set skills roadmap
   */
  async setSkillsRoadmap(jobId: string, roadmap: SkillsRoadmap): Promise<void> {
    await this.update(jobId, { skillsRoadmap: roadmap });
  },

  /**
   * Set topic details
   */
  async setTopicDetails(jobId: string, topic: string, details: TopicDetails): Promise<void> {
    const job = await this.get(jobId);
    if (!job || !job.technicalInterviewPrep) throw new Error('Job or prep not found');

    const currentDetails = job.technicalInterviewPrep.topicDetails || {};
    const updatedPrep = {
      ...job.technicalInterviewPrep,
      topicDetails: {
        ...currentDetails,
        [topic]: details,
      },
    };

    await this.update(jobId, { technicalInterviewPrep: updatedPrep });
  },

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string): Promise<void> {
    const job = await this.get(id);
    if (!job) throw new Error('Job not found');

    await this.update(id, { isFavorite: !job.isFavorite });
  },

  /**
   * Add tag
   */
  async addTag(id: string, tag: string): Promise<void> {
    const job = await this.get(id);
    if (!job) throw new Error('Job not found');

    if (!job.tags.includes(tag)) {
      await this.update(id, { tags: [...job.tags, tag] });
    }
  },

  /**
   * Remove tag
   */
  async removeTag(id: string, tag: string): Promise<void> {
    const job = await this.get(id);
    if (!job) throw new Error('Job not found');

    await this.update(id, { tags: job.tags.filter((t) => t !== tag) });
  },

  /**
   * Link to application
   */
  async linkToApplication(jobId: string, applicationId: string): Promise<void> {
    await this.update(jobId, { applicationId });
  },

  /**
   * Get favorites
   */
  async getFavorites(): Promise<AnalyzedJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('analyzed_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToAnalyzedJob);
  },

  /**
   * Get by type
   */
  async getByType(type: AnalyzedJobType): Promise<AnalyzedJob[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('analyzed_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToAnalyzedJob);
  },

  /**
   * Search jobs
   */
  async search(query: string): Promise<AnalyzedJob[]> {
    const allJobs = await this.list();
    const lowerQuery = query.toLowerCase();

    return allJobs.filter(
      (job) =>
        job.company?.toLowerCase().includes(lowerQuery) ||
        job.role?.toLowerCase().includes(lowerQuery) ||
        job.jobDescription.toLowerCase().includes(lowerQuery) ||
        job.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Batch upsert jobs (for migration)
   */
  async upsertMany(jobs: AnalyzedJob[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = jobs.map((j) => ({
      id: j.id,
      user_id: user.id,
      profile_id: j.profileId || null,
      application_id: j.applicationId || null,
      job_description: j.jobDescription,
      type: j.type as 'fulltime' | 'freelance' | 'contract',
      company: j.company || null,
      role: j.role || null,
      location: j.location || null,
      salary_range: j.salaryRange || null,
      source: j.source || null,
      job_url: j.jobUrl || null,
      analysis: j.analysis as unknown as Json,
      cover_letters: (j.coverLetters || []) as unknown as Json,
      phone_screen_prep: (j.phoneScreenPrep || null) as unknown as Json,
      technical_interview_prep: (j.technicalInterviewPrep || null) as unknown as Json,
      application_strategy: (j.applicationStrategy || null) as unknown as Json,
      skills_roadmap: (j.skillsRoadmap || null) as unknown as Json,
      screening_questions: (j.screeningQuestions || []) as unknown as Json,
      application_questions: (j.applicationQuestions || []) as unknown as Json,
      is_favorite: j.isFavorite,
      notes: j.notes || null,
      tags: j.tags || [],
      created_at: j.createdAt,
      updated_at: j.updatedAt,
    }));

    const { error } = await from('analyzed_jobs')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to job changes
   */
  subscribe(callback: (jobs: AnalyzedJob[]) => void) {
    const channel = supabase
      .channel('analyzed-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analyzed_jobs',
        },
        async () => {
          const jobs = await this.list();
          callback(jobs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

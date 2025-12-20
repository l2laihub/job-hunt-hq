/**
 * Analyzed Jobs Store - Supabase Version
 * Manages analyzed job data with Supabase backend
 */
import { create } from 'zustand';
import type {
  AnalyzedJob,
  AnalyzedJobType,
  CoverLetter,
  PhoneScreenPrep,
  TechnicalInterviewPrep,
  ApplicationStrategy,
  SkillsRoadmap,
  ApplicationQuestionAnswer,
  TopicDetails,
} from '@/src/types';
import { analyzedJobsService } from '@/src/services/database';
import { generateId } from '@/src/lib/utils';

interface AnalyzedJobsState {
  jobs: AnalyzedJob[];
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchJobs: () => Promise<void>;

  // CRUD
  addJob: (job: Partial<AnalyzedJob>, profileId?: string) => Promise<AnalyzedJob>;
  updateJob: (id: string, updates: Partial<AnalyzedJob>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  // Cover Letter Management
  addCoverLetter: (jobId: string, coverLetter: Omit<CoverLetter, 'id'>) => Promise<void>;
  updateCoverLetter: (jobId: string, coverLetterId: string, updates: Partial<CoverLetter>) => Promise<void>;
  deleteCoverLetter: (jobId: string, coverLetterId: string) => Promise<void>;

  // Prep Content
  setPhoneScreenPrep: (jobId: string, prep: PhoneScreenPrep) => Promise<void>;
  setTechnicalInterviewPrep: (jobId: string, prep: TechnicalInterviewPrep) => Promise<void>;
  setApplicationStrategy: (jobId: string, strategy: ApplicationStrategy) => Promise<void>;
  setSkillsRoadmap: (jobId: string, roadmap: SkillsRoadmap) => Promise<void>;

  // Topic Details
  setTopicDetails: (jobId: string, topic: string, details: TopicDetails) => Promise<void>;
  updateTopicPractice: (jobId: string, topic: string, confidenceLevel?: 'low' | 'medium' | 'high') => Promise<void>;

  // Application Questions
  addApplicationQuestion: (jobId: string, question: Omit<ApplicationQuestionAnswer, 'id' | 'createdAt' | 'copyCount'>) => Promise<void>;
  updateApplicationQuestion: (jobId: string, questionId: string, updates: Partial<ApplicationQuestionAnswer>) => Promise<void>;
  deleteApplicationQuestion: (jobId: string, questionId: string) => Promise<void>;
  incrementQuestionCopyCount: (jobId: string, questionId: string) => Promise<void>;

  // Favorites & Tags
  toggleFavorite: (id: string) => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;

  // Link to Application
  linkToApplication: (jobId: string, applicationId: string) => Promise<void>;

  // Queries (synchronous, from local state)
  getJobById: (id: string) => AnalyzedJob | undefined;
  getJobsByType: (type: AnalyzedJobType) => AnalyzedJob[];
  getFavorites: () => AnalyzedJob[];
  searchJobs: (query: string) => AnalyzedJob[];
  getRecentJobs: (limit?: number) => AnalyzedJob[];
  getJobsByProfile: (profileId: string) => AnalyzedJob[];

  // Import/Export
  importJobs: (jobs: AnalyzedJob[]) => Promise<void>;
  exportJobs: () => AnalyzedJob[];

  // Real-time subscription
  subscribeToChanges: () => () => void;
}

export const useSupabaseAnalyzedJobsStore = create<AnalyzedJobsState>()((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const jobs = await analyzedJobsService.list();
      set({ jobs, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch jobs',
        isLoading: false,
      });
    }
  },

  addJob: async (partial, profileId) => {
    try {
      const created = await analyzedJobsService.create(partial, profileId);
      set((state) => ({
        jobs: [created, ...state.jobs],
      }));
      return created;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add job' });
      throw error;
    }
  },

  updateJob: async (id, updates) => {
    try {
      const updated = await analyzedJobsService.update(id, updates);
      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updated : job)),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update job' });
      throw error;
    }
  },

  deleteJob: async (id) => {
    try {
      await analyzedJobsService.delete(id);
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete job' });
      throw error;
    }
  },

  addCoverLetter: async (jobId, coverLetter) => {
    try {
      await analyzedJobsService.addCoverLetter(jobId, coverLetter);
      // Refetch to get updated data
      const updated = await analyzedJobsService.get(jobId);
      if (updated) {
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? updated : job)),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add cover letter' });
      throw error;
    }
  },

  updateCoverLetter: async (jobId, coverLetterId, updates) => {
    try {
      await analyzedJobsService.updateCoverLetter(jobId, coverLetterId, updates);
      const updated = await analyzedJobsService.get(jobId);
      if (updated) {
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? updated : job)),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update cover letter' });
      throw error;
    }
  },

  deleteCoverLetter: async (jobId, coverLetterId) => {
    try {
      await analyzedJobsService.deleteCoverLetter(jobId, coverLetterId);
      const updated = await analyzedJobsService.get(jobId);
      if (updated) {
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? updated : job)),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete cover letter' });
      throw error;
    }
  },

  setPhoneScreenPrep: async (jobId, prep) => {
    try {
      await analyzedJobsService.setPhoneScreenPrep(jobId, prep);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, phoneScreenPrep: prep, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set phone screen prep' });
      throw error;
    }
  },

  setTechnicalInterviewPrep: async (jobId, prep) => {
    try {
      await analyzedJobsService.setTechnicalInterviewPrep(jobId, prep);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, technicalInterviewPrep: prep, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set technical interview prep' });
      throw error;
    }
  },

  setApplicationStrategy: async (jobId, strategy) => {
    try {
      await analyzedJobsService.setApplicationStrategy(jobId, strategy);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, applicationStrategy: strategy, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set application strategy' });
      throw error;
    }
  },

  setSkillsRoadmap: async (jobId, roadmap) => {
    try {
      await analyzedJobsService.setSkillsRoadmap(jobId, roadmap);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, skillsRoadmap: roadmap, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set skills roadmap' });
      throw error;
    }
  },

  setTopicDetails: async (jobId, topic, details) => {
    try {
      await analyzedJobsService.setTopicDetails(jobId, topic, details);
      const updated = await analyzedJobsService.get(jobId);
      if (updated) {
        set((state) => ({
          jobs: state.jobs.map((job) => (job.id === jobId ? updated : job)),
        }));
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to set topic details' });
      throw error;
    }
  },

  updateTopicPractice: async (jobId, topic, confidenceLevel) => {
    try {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job || !job.technicalInterviewPrep?.topicDetails?.[topic]) {
        throw new Error('Job or topic not found');
      }

      const existingDetails = job.technicalInterviewPrep.topicDetails[topic];
      const updatedDetails = {
        ...existingDetails,
        practiceCount: existingDetails.practiceCount + 1,
        lastPracticedAt: new Date().toISOString(),
        confidenceLevel: confidenceLevel || existingDetails.confidenceLevel,
      };

      await analyzedJobsService.setTopicDetails(jobId, topic, updatedDetails);

      set((state) => ({
        jobs: state.jobs.map((j) => {
          if (j.id !== jobId || !j.technicalInterviewPrep) return j;
          return {
            ...j,
            technicalInterviewPrep: {
              ...j.technicalInterviewPrep,
              topicDetails: {
                ...j.technicalInterviewPrep.topicDetails,
                [topic]: updatedDetails,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update topic practice' });
      throw error;
    }
  },

  addApplicationQuestion: async (jobId, question) => {
    try {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const newQuestion: ApplicationQuestionAnswer = {
        ...question,
        id: generateId(),
        copyCount: 0,
        createdAt: new Date().toISOString(),
      };

      await analyzedJobsService.update(jobId, {
        applicationQuestions: [...(job.applicationQuestions || []), newQuestion],
      });

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, applicationQuestions: [...(j.applicationQuestions || []), newQuestion], updatedAt: new Date().toISOString() }
            : j
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add application question' });
      throw error;
    }
  },

  updateApplicationQuestion: async (jobId, questionId, updates) => {
    try {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const updatedQuestions = (job.applicationQuestions || []).map((q) =>
        q.id === questionId ? { ...q, ...updates, editedAt: new Date().toISOString() } : q
      );

      await analyzedJobsService.update(jobId, { applicationQuestions: updatedQuestions });

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, applicationQuestions: updatedQuestions, updatedAt: new Date().toISOString() }
            : j
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update application question' });
      throw error;
    }
  },

  deleteApplicationQuestion: async (jobId, questionId) => {
    try {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const updatedQuestions = (job.applicationQuestions || []).filter((q) => q.id !== questionId);

      await analyzedJobsService.update(jobId, { applicationQuestions: updatedQuestions });

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, applicationQuestions: updatedQuestions, updatedAt: new Date().toISOString() }
            : j
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete application question' });
      throw error;
    }
  },

  incrementQuestionCopyCount: async (jobId, questionId) => {
    try {
      const job = get().jobs.find((j) => j.id === jobId);
      if (!job) throw new Error('Job not found');

      const updatedQuestions = (job.applicationQuestions || []).map((q) =>
        q.id === questionId ? { ...q, copyCount: q.copyCount + 1 } : q
      );

      await analyzedJobsService.update(jobId, { applicationQuestions: updatedQuestions });

      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId ? { ...j, applicationQuestions: updatedQuestions } : j
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to increment copy count' });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    try {
      await analyzedJobsService.toggleFavorite(id);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id ? { ...job, isFavorite: !job.isFavorite, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle favorite' });
      throw error;
    }
  },

  addTag: async (id, tag) => {
    try {
      await analyzedJobsService.addTag(id, tag);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id && !job.tags.includes(tag)
            ? { ...job, tags: [...job.tags, tag], updatedAt: new Date().toISOString() }
            : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add tag' });
      throw error;
    }
  },

  removeTag: async (id, tag) => {
    try {
      await analyzedJobsService.removeTag(id, tag);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === id
            ? { ...job, tags: job.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }
            : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove tag' });
      throw error;
    }
  },

  linkToApplication: async (jobId, applicationId) => {
    try {
      await analyzedJobsService.linkToApplication(jobId, applicationId);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, applicationId, updatedAt: new Date().toISOString() } : job
        ),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to link to application' });
      throw error;
    }
  },

  getJobById: (id) => {
    return get().jobs.find((job) => job.id === id);
  },

  getJobsByType: (type) => {
    return get().jobs.filter((job) => job.type === type);
  },

  getFavorites: () => {
    return get().jobs.filter((job) => job.isFavorite);
  },

  searchJobs: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().jobs.filter(
      (job) =>
        job.company?.toLowerCase().includes(lowerQuery) ||
        job.role?.toLowerCase().includes(lowerQuery) ||
        job.jobDescription.toLowerCase().includes(lowerQuery) ||
        job.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  getRecentJobs: (limit = 10) => {
    return get()
      .jobs.slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  getJobsByProfile: (profileId) => {
    return get().jobs.filter((job) => job.profileId === profileId);
  },

  importJobs: async (jobs) => {
    try {
      await analyzedJobsService.upsertMany(jobs);
      await get().fetchJobs();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to import jobs' });
      throw error;
    }
  },

  exportJobs: () => {
    return get().jobs;
  },

  subscribeToChanges: () => {
    return analyzedJobsService.subscribe((jobs) => {
      set({ jobs });
    });
  },
}));

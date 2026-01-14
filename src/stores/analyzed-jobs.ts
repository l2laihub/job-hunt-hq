import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
import { STORAGE_KEYS } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';
import { createSyncedStorage, setupStoreSync } from '@/src/lib/storage-sync';

interface AnalyzedJobsState {
  jobs: AnalyzedJob[];
  isLoading: boolean;

  // Currently selected job (for context awareness across app)
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;

  // CRUD
  addJob: (job: Partial<AnalyzedJob>, profileId?: string) => AnalyzedJob;
  updateJob: (id: string, updates: Partial<AnalyzedJob>) => void;
  deleteJob: (id: string) => void;

  // Cover Letter Management
  addCoverLetter: (jobId: string, coverLetter: Omit<CoverLetter, 'id'>) => void;
  updateCoverLetter: (jobId: string, coverLetterId: string, updates: Partial<CoverLetter>) => void;
  deleteCoverLetter: (jobId: string, coverLetterId: string) => void;

  // Prep Content
  setPhoneScreenPrep: (jobId: string, prep: PhoneScreenPrep) => void;
  setTechnicalInterviewPrep: (jobId: string, prep: TechnicalInterviewPrep) => void;
  setApplicationStrategy: (jobId: string, strategy: ApplicationStrategy) => void;
  setSkillsRoadmap: (jobId: string, roadmap: SkillsRoadmap) => void;

  // Topic Details (for expanded study cards)
  setTopicDetails: (jobId: string, topic: string, details: TopicDetails) => void;
  updateTopicPractice: (jobId: string, topic: string, confidenceLevel?: 'low' | 'medium' | 'high') => void;

  // Application Questions
  addApplicationQuestion: (jobId: string, question: Omit<ApplicationQuestionAnswer, 'id' | 'createdAt' | 'copyCount'>) => void;
  updateApplicationQuestion: (jobId: string, questionId: string, updates: Partial<ApplicationQuestionAnswer>) => void;
  deleteApplicationQuestion: (jobId: string, questionId: string) => void;
  incrementQuestionCopyCount: (jobId: string, questionId: string) => void;

  // Favorites & Tags
  toggleFavorite: (id: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;

  // Link to Application
  linkToApplication: (jobId: string, applicationId: string) => void;
  unlinkFromApplication: (jobId: string) => void;

  // Queries
  getJobById: (id: string) => AnalyzedJob | undefined;
  getJobsByType: (type: AnalyzedJobType) => AnalyzedJob[];
  getFavorites: () => AnalyzedJob[];
  searchJobs: (query: string) => AnalyzedJob[];
  getRecentJobs: (limit?: number) => AnalyzedJob[];

  // Profile-filtered queries
  getJobsByProfile: (profileId: string) => AnalyzedJob[];

  // Import/Export
  importJobs: (jobs: AnalyzedJob[]) => void;
  exportJobs: () => AnalyzedJob[];
}

export const useAnalyzedJobsStore = create<AnalyzedJobsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      isLoading: false,
      selectedJobId: null,

      setSelectedJobId: (id) => {
        set({ selectedJobId: id });
      },

      addJob: (partial, profileId) => {
        const now = new Date().toISOString();
        const newJob: AnalyzedJob = {
          id: generateId(),
          jobDescription: partial.jobDescription || '',
          type: partial.type || 'fulltime',
          company: partial.company,
          role: partial.role,
          location: partial.location,
          salaryRange: partial.salaryRange,
          source: partial.source,
          jobUrl: partial.jobUrl,
          analysis: partial.analysis!,
          coverLetters: partial.coverLetters || [],
          phoneScreenPrep: partial.phoneScreenPrep,
          technicalInterviewPrep: partial.technicalInterviewPrep,
          applicationStrategy: partial.applicationStrategy,
          screeningQuestions: partial.screeningQuestions,
          applicationId: partial.applicationId,
          isFavorite: partial.isFavorite || false,
          notes: partial.notes,
          tags: partial.tags || [],
          createdAt: now,
          updatedAt: now,
          profileId: profileId || partial.profileId,
        };

        set((state) => ({
          jobs: [newJob, ...state.jobs],
        }));

        return newJob;
      },

      updateJob: (id, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, ...updates, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      deleteJob: (id) => {
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id),
        }));
      },

      addCoverLetter: (jobId, coverLetter) => {
        const newCoverLetter: CoverLetter = {
          ...coverLetter,
          id: generateId(),
        };

        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  coverLetters: [...job.coverLetters, newCoverLetter],
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      updateCoverLetter: (jobId, coverLetterId, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  coverLetters: job.coverLetters.map((cl) =>
                    cl.id === coverLetterId
                      ? { ...cl, ...updates, editedAt: new Date().toISOString() }
                      : cl
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      deleteCoverLetter: (jobId, coverLetterId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  coverLetters: job.coverLetters.filter((cl) => cl.id !== coverLetterId),
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      setPhoneScreenPrep: (jobId, prep) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, phoneScreenPrep: prep, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      setTechnicalInterviewPrep: (jobId, prep) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, technicalInterviewPrep: prep, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      setApplicationStrategy: (jobId, strategy) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, applicationStrategy: strategy, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      setSkillsRoadmap: (jobId, roadmap) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, skillsRoadmap: roadmap, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      setTopicDetails: (jobId, topic, details) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id !== jobId || !job.technicalInterviewPrep) return job;
            const currentDetails = job.technicalInterviewPrep.topicDetails || {};
            return {
              ...job,
              technicalInterviewPrep: {
                ...job.technicalInterviewPrep,
                topicDetails: {
                  ...currentDetails,
                  [topic]: details,
                },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      updateTopicPractice: (jobId, topic, confidenceLevel) => {
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.id !== jobId || !job.technicalInterviewPrep?.topicDetails?.[topic]) return job;
            const existingDetails = job.technicalInterviewPrep.topicDetails[topic];
            return {
              ...job,
              technicalInterviewPrep: {
                ...job.technicalInterviewPrep,
                topicDetails: {
                  ...job.technicalInterviewPrep.topicDetails,
                  [topic]: {
                    ...existingDetails,
                    practiceCount: existingDetails.practiceCount + 1,
                    lastPracticedAt: new Date().toISOString(),
                    confidenceLevel: confidenceLevel || existingDetails.confidenceLevel,
                  },
                },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addApplicationQuestion: (jobId, question) => {
        const newQuestion: ApplicationQuestionAnswer = {
          ...question,
          id: generateId(),
          copyCount: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  applicationQuestions: [...(job.applicationQuestions || []), newQuestion],
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      updateApplicationQuestion: (jobId, questionId, updates) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  applicationQuestions: (job.applicationQuestions || []).map((q) =>
                    q.id === questionId
                      ? { ...q, ...updates, editedAt: new Date().toISOString() }
                      : q
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      deleteApplicationQuestion: (jobId, questionId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  applicationQuestions: (job.applicationQuestions || []).filter((q) => q.id !== questionId),
                  updatedAt: new Date().toISOString(),
                }
              : job
          ),
        }));
      },

      incrementQuestionCopyCount: (jobId, questionId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  applicationQuestions: (job.applicationQuestions || []).map((q) =>
                    q.id === questionId
                      ? { ...q, copyCount: q.copyCount + 1 }
                      : q
                  ),
                }
              : job
          ),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, isFavorite: !job.isFavorite, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      addTag: (id, tag) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id && !job.tags.includes(tag)
              ? { ...job, tags: [...job.tags, tag], updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === id
              ? { ...job, tags: job.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      linkToApplication: (jobId, applicationId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, applicationId, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
      },

      unlinkFromApplication: (jobId) => {
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, applicationId: undefined, updatedAt: new Date().toISOString() }
              : job
          ),
        }));
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

      importJobs: (jobs) => {
        set((state) => {
          // Deduplicate by ID first
          const existingIds = new Set(state.jobs.map((j) => j.id));
          // Then deduplicate by company + role combination to prevent duplicate entries
          const existingKeys = new Set(state.jobs.map((j) => `${(j.company || '').toLowerCase()}|${(j.role || '').toLowerCase()}`));
          const newJobs = jobs.filter((j) =>
            !existingIds.has(j.id) &&
            !existingKeys.has(`${(j.company || '').toLowerCase()}|${(j.role || '').toLowerCase()}`)
          );
          return {
            jobs: [...newJobs, ...state.jobs],
          };
        });
      },

      exportJobs: () => {
        return get().jobs;
      },
    }),
    {
      name: STORAGE_KEYS.ANALYZED_JOBS,
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({ jobs: state.jobs }),
    }
  )
);

// Set up cross-tab sync for analyzed jobs store
let analyzedJobsSyncUnsubscribe: (() => void) | null = null;

export function initAnalyzedJobsSync(): void {
  if (analyzedJobsSyncUnsubscribe) return;

  analyzedJobsSyncUnsubscribe = setupStoreSync<AnalyzedJobsState>(
    STORAGE_KEYS.ANALYZED_JOBS,
    (updates) => useAnalyzedJobsStore.setState(updates),
    () => ['jobs']
  );
}

export function destroyAnalyzedJobsSync(): void {
  if (analyzedJobsSyncUnsubscribe) {
    analyzedJobsSyncUnsubscribe();
    analyzedJobsSyncUnsubscribe = null;
  }
}

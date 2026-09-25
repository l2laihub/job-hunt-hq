/**
 * Applications Database Service
 * Handles all job application-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import { todayLocal } from '@/src/lib/utils';
import type { JobApplication, ApplicationStatus, JDAnalysis, CompanyResearch } from '@/src/types';
import type { Json } from '@/src/lib/supabase/types';
import {
  applicationRowToJobApplication,
  jobApplicationToRow,
} from './types';

export const applicationsService = {
  /**
   * Fetch all applications for the current user
   */
  async list(): Promise<JobApplication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(applicationRowToJobApplication);
  },

  /**
   * Get applications for a specific profile
   */
  async listByProfile(profileId: string): Promise<JobApplication[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('applications')
      .select('*')
      .eq('user_id', user.id)
      .or(`profile_id.eq.${profileId},profile_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(applicationRowToJobApplication);
  },

  /**
   * Get a single application by ID
   */
  async get(id: string): Promise<JobApplication | null> {
    const { data, error } = await from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return applicationRowToJobApplication(data);
  },

  /**
   * Create a new application
   */
  async create(app: Omit<JobApplication, 'createdAt' | 'updatedAt'>): Promise<JobApplication> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date().toISOString();
    const fullApp: JobApplication = {
      ...app,
      createdAt: now,
      updatedAt: now,
    };

    const row = jobApplicationToRow(fullApp, user.id);

    const { data, error } = await from('applications')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return applicationRowToJobApplication(data);
  },

  /**
   * Update an existing application
   */
  async update(id: string, updates: Partial<JobApplication>): Promise<JobApplication> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.source !== undefined) updateData.source = updates.source;
    if (updates.salaryRange !== undefined) updateData.salary_range = updates.salaryRange;
    if (updates.dateApplied !== undefined) updateData.date_applied = updates.dateApplied;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.jobDescriptionRaw !== undefined) updateData.job_description_raw = updates.jobDescriptionRaw;
    if (updates.platform !== undefined) updateData.platform = updates.platform;
    if (updates.proposalSent !== undefined) updateData.proposal_sent = updates.proposalSent;
    if (updates.analysis !== undefined) updateData.analysis = updates.analysis as unknown as Json;
    if (updates.companyResearch !== undefined) updateData.company_research = updates.companyResearch as unknown as Json;
    if (updates.profileId !== undefined) updateData.profile_id = updates.profileId;
    if (updates.recruiter !== undefined) updateData.recruiter = updates.recruiter || null;
    if (updates.recruiterContact !== undefined) updateData.recruiter_contact = updates.recruiterContact || null;
    if (updates.contactedDate !== undefined) updateData.contacted_date = updates.contactedDate || null;
    if (updates.nextAction !== undefined) updateData.next_action = updates.nextAction || null;
    if (updates.nextActionDate !== undefined) updateData.next_action_date = updates.nextActionDate || null;
    if (updates.compMin !== undefined) updateData.comp_min = updates.compMin ?? null;
    if (updates.compMax !== undefined) updateData.comp_max = updates.compMax ?? null;
    if (updates.compUnit !== undefined) updateData.comp_unit = updates.compUnit || null;
    if (updates.compCurrency !== undefined) updateData.comp_currency = updates.compCurrency || null;

    const { data, error } = await from('applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return applicationRowToJobApplication(data);
  },

  /**
   * Delete an application
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('applications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete multiple applications
   */
  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await from('applications')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  /**
   * Update application status
   */
  async updateStatus(id: string, status: ApplicationStatus): Promise<JobApplication> {
    const updates: Partial<JobApplication> = { status };

    // Auto-stamp the date a role first reaches 'applied' / 'contact'
    if (status === 'applied' || status === 'contact') {
      const current = await this.get(id);
      if (status === 'applied' && current && !current.dateApplied) {
        updates.dateApplied = new Date().toISOString();
      }
      if (status === 'contact' && current && !current.contactedDate) {
        updates.contactedDate = todayLocal();
      }
    }

    return this.update(id, updates);
  },

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(ids: string[], status: ApplicationStatus): Promise<void> {
    const { error } = await from('applications')
      .update({ status })
      .in('id', ids);

    if (error) throw error;
  },

  /**
   * Set analysis for an application
   */
  async setAnalysis(id: string, analysis: JDAnalysis): Promise<JobApplication> {
    return this.update(id, { analysis });
  },

  /**
   * Set company research for an application
   */
  async setResearch(id: string, research: CompanyResearch): Promise<JobApplication> {
    return this.update(id, { companyResearch: research });
  },

  /**
   * Batch upsert applications (for migration)
   */
  async upsertMany(apps: JobApplication[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = apps.map((a) => jobApplicationToRow(a, user.id));

    const { error } = await from('applications')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to application changes
   */
  subscribe(callback: (applications: JobApplication[]) => void) {
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        async () => {
          const applications = await this.list();
          callback(applications);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

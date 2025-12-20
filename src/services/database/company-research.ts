/**
 * Company Research Database Service
 * Handles all company research-related database operations
 */
import { supabase, from } from '@/src/lib/supabase';
import type { CompanyResearch } from '@/src/types';
import {
  companyResearchRowToCompanyResearch,
  companyResearchToRow,
} from './types';

export const companyResearchService = {
  /**
   * Fetch all research for the current user
   */
  async list(): Promise<CompanyResearch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('company_research')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(companyResearchRowToCompanyResearch);
  },

  /**
   * Get research by ID
   */
  async get(id: string): Promise<CompanyResearch | null> {
    const { data, error } = await from('company_research')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return companyResearchRowToCompanyResearch(data);
  },

  /**
   * Get research by company name
   */
  async getByCompany(companyName: string): Promise<CompanyResearch | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await from('company_research')
      .select('*')
      .eq('user_id', user.id)
      .ilike('company_name', companyName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return companyResearchRowToCompanyResearch(data);
  },

  /**
   * Create or update research (upsert by company name)
   */
  async upsert(research: Omit<CompanyResearch, 'id'>): Promise<CompanyResearch> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if research exists for this company
    const existing = await this.getByCompany(research.companyName);

    if (existing) {
      // Update existing
      const row = companyResearchToRow({ ...research, id: existing.id }, user.id);

      const { data, error } = await from('company_research')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return companyResearchRowToCompanyResearch(data);
    } else {
      // Create new
      const id = crypto.randomUUID();
      const row = companyResearchToRow({ ...research, id }, user.id);

      const { data, error } = await from('company_research')
        .insert(row)
        .select()
        .single();

      if (error) throw error;
      return companyResearchRowToCompanyResearch(data);
    }
  },

  /**
   * Delete research
   */
  async delete(id: string): Promise<void> {
    const { error } = await from('company_research')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get stats
   */
  async getStats(): Promise<{
    total: number;
    byVerdict: Record<'green' | 'yellow' | 'red', number>;
  }> {
    const researches = await this.list();
    const total = researches.length;

    const byVerdict = researches.reduce(
      (acc, r) => {
        acc[r.verdict.overall] = (acc[r.verdict.overall] || 0) + 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0 } as Record<'green' | 'yellow' | 'red', number>
    );

    return { total, byVerdict };
  },

  /**
   * Batch upsert research (for migration)
   */
  async upsertMany(researches: CompanyResearch[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = researches.map((r) => companyResearchToRow(r, user.id));

    const { error } = await from('company_research')
      .upsert(rows, { onConflict: 'id' });

    if (error) throw error;
  },

  /**
   * Subscribe to research changes
   */
  subscribe(callback: (researches: CompanyResearch[]) => void) {
    const channel = supabase
      .channel('company-research-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_research',
        },
        async () => {
          const researches = await this.list();
          callback(researches);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

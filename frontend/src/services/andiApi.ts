import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementAudience = 'all' | 'beezero' | 'ecodelivery';

export interface Announcement {
  announcementId: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  startDate: string;
  endDate?: string | null;
  audience: AnnouncementAudience;
  status?: string;
  createdAt?: number;
  createdByName?: string;
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  startDate: string;
  endDate?: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
}

export interface AnnouncementStats {
  total: number;
  read: number;
  pending: number;
  percentage: number;
  pendingUsers: string[];
  readUsers: string[];
}

export const announcementsApi = {
  async getPending(): Promise<{ announcements: Announcement[] }> {
    const { data } = await axios.get<{ success: boolean; announcements: Announcement[] }>(
      `${API_BASE}/api/announcements/pending`
    );
    return { announcements: data.announcements || [] };
  },

  async markRead(announcementId: string): Promise<void> {
    await axios.post(`${API_BASE}/api/announcements/${announcementId}/read`);
  },
};

export const andiApi = {
  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    const { data } = await axios.post<{ success: boolean; announcement: Announcement }>(
      `${API_BASE}/api/andi/announcements`,
      input
    );
    return data.announcement;
  },

  async getAnnouncements(status?: 'active' | 'expired' | 'all'): Promise<Announcement[]> {
    const { data } = await axios.get<{ success: boolean; announcements: Announcement[] }>(
      `${API_BASE}/api/andi/announcements`,
      { params: status ? { status } : undefined }
    );
    return data.announcements || [];
  },

  async deleteAnnouncement(id: string): Promise<void> {
    await axios.delete(`${API_BASE}/api/andi/announcements/${id}`);
  },

  async getStats(id: string): Promise<AnnouncementStats> {
    const { data } = await axios.get<{ success: boolean; stats: AnnouncementStats }>(
      `${API_BASE}/api/andi/announcements/${id}/stats`
    );
    return data.stats;
  },
};

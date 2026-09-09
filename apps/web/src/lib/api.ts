const API_BASE_URL = 'http://localhost:5000/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  role?: string;
  status?: string;
  fullName?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  customerProfile?: {
    id: string;
    fullName: string;
    phone: string;
    address?: string;
    nationality?: string;
  };
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description?: string;
  systemName: string;
  status: string;
  ticketPrice: number;
  maxTickets: number;
  soldTickets?: number;
  remainingTickets?: number;
  _count?: {
    tickets: number;
  };
  startDate: string;
  endDate: string;
  drawDate?: string;
  vehicles: Vehicle[];
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  engineInfo?: string;
  transmission?: string;
  fuelType?: string;
  vinChassisNumber: string;
  registrationInfo?: string;
  vehicleCondition: string;
  location?: string;
  declaredValue: number;
  status: string;
  images: string[];
  documents: string[];
}

export interface Ticket {
  id: string;
  campaignId: string;
  customerId: string;
  purchaseId: string;
  paymentId?: string;
  issueTimestamp: string;
  status: string;
  verificationHash: string;
  qrCodeToken: string;
  drawEligibility: boolean;
  drawId?: string;
  drawResultHash?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('auth_token');
    const language = localStorage.getItem('i18nextLng') || 'en';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': language,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return { success: false, error: 'Session expired. Please log in again.' };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Request failed',
      };
    }

    return {
      success: true,
      data,
    };
  }

  // Auth
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; accessToken?: string; user: User }>> {
    const res = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.success && res.data) {
      const token = res.data.token || res.data.accessToken;
      return {
        success: true,
        data: {
          token,
          accessToken: token,
          user: res.data.user,
        },
      };
    }
    return res;
  }

  async register(username: string, email: string, password: string, fullName: string, phone: string): Promise<ApiResponse<{ token: string; accessToken?: string; user: User }>> {
    const res = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, fullName, phone }),
    });

    if (res.success && res.data) {
      const token = res.data.token || res.data.accessToken;
      return {
        success: true,
        data: {
          token,
          accessToken: token,
          user: res.data.user,
        },
      };
    }
    return res;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const res = await this.request<any>('/auth/me');
    if (res.success && res.data) {
      return {
        success: true,
        data: res.data.user || res.data,
      };
    }
    return res;
  }

  // Campaigns
  async getCampaigns(): Promise<ApiResponse<Campaign[]>> {
    const res = await this.request<any>('/campaigns');
    if (res.success && res.data) {
      const list = res.data.campaigns || (Array.isArray(res.data) ? res.data : []);
      return {
        success: true,
        data: list,
      };
    }
    return {
      success: res.success,
      error: res.error,
      data: [],
    };
  }

  async getCampaign(id: string): Promise<ApiResponse<Campaign>> {
    const res = await this.request<any>(`/campaigns/${id}`);
    if (res.success && res.data) {
      return {
        success: true,
        data: res.data.campaign || res.data,
      };
    }
    return res;
  }

  // Tickets
  async getAvailableTickets(campaignId: string): Promise<ApiResponse<{ availableNumbers: string[]; totalAvailable: number; maxTickets: number }>> {
    return this.request<any>(`/tickets/available/${campaignId}`);
  }

  async buyTicket(campaignId: string, quantity: number = 1): Promise<ApiResponse<{ tickets: Ticket[]; order: any }>> {
    return this.request('/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify({ campaignId, quantity }),
    });
  }

  async getMyTickets(): Promise<ApiResponse<Ticket[]>> {
    const res = await this.request<any>('/tickets/my');
    if (res.success && res.data) {
      const list = res.data.tickets || (Array.isArray(res.data) ? res.data : []);
      return {
        success: true,
        data: list,
      };
    }
    return {
      success: res.success,
      error: res.error,
      data: [],
    };
  }

  // Profile
  async updateProfile(data: { fullName?: string; phone?: string; address?: string }): Promise<ApiResponse<User>> {
    return this.request('/customers/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Checkout (direct purchase)
  async checkout(campaignId: string, quantity: number, paymentProvider: string, phoneNumber?: string, ticketNumbers?: string[]): Promise<ApiResponse<{ tickets: Ticket[]; order: any; campaign: Campaign; requiresOtp: boolean; orderId?: string; phoneNumber?: string }>> {
    return this.request('/tickets/checkout', {
      method: 'POST',
      body: JSON.stringify({ campaignId, quantity, paymentProvider, phoneNumber, ticketNumbers }),
    });
  }

  // Verify OTP to complete purchase
  async verifyOtp(orderId: string, otp: string): Promise<ApiResponse<{ tickets: Ticket[]; order: any; campaign: Campaign }>> {
    return this.request('/tickets/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ orderId, otp }),
    });
  }

  // Resend OTP
  async resendOtp(orderId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/tickets/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  // Admin - Stats
  async getAdminStats(): Promise<ApiResponse<any>> {
    const res = await this.request<any>('/admin/dashboard');
    if (res.success && res.data) return { success: true, data: res.data.metrics || res.data.stats || res.data };
    return res;
  }

  // Admin - Campaigns (all statuses)
  async getAdminCampaigns(): Promise<ApiResponse<Campaign[]>> {
    const res = await this.request<any>('/campaigns?includeDraft=true');
    if (res.success && res.data) {
      const list = res.data.campaigns || (Array.isArray(res.data) ? res.data : []);
      return { success: true, data: list };
    }
    return { success: res.success, error: res.error, data: [] };
  }

  // Admin - Create campaign
  async createCampaign(data: any): Promise<ApiResponse<Campaign>> {
    const res = await this.request<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) });
    if (res.success && res.data) return { success: true, data: res.data.campaign || res.data };
    return res;
  }

  // Admin - Update campaign & vehicle/images
  async updateCampaign(id: string, data: any): Promise<ApiResponse<Campaign>> {
    const res = await this.request<any>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (res.success && res.data) return { success: true, data: res.data.campaign || res.data };
    return res;
  }

  // Admin - Update vehicle directly
  async updateVehicle(id: string, data: any): Promise<ApiResponse<Vehicle>> {
    const res = await this.request<any>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (res.success && res.data) return { success: true, data: res.data.vehicle || res.data };
    return res;
  }

  // Admin - Upload car image from local computer
  async uploadImage(base64Data: string, filename?: string): Promise<ApiResponse<{ url: string; filename: string }>> {
    return this.request<{ url: string; filename: string }>('/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Data, filename }),
    });
  }

  // Admin - Publish campaign
  async publishCampaign(id: string): Promise<ApiResponse<Campaign>> {
    const res = await this.request<any>(`/campaigns/${id}/publish`, { method: 'POST' });
    if (res.success && res.data) return { success: true, data: res.data.campaign || res.data };
    return res;
  }

  // Admin - Cancel campaign
  async cancelCampaign(id: string): Promise<ApiResponse<Campaign>> {
    const res = await this.request<any>(`/campaigns/${id}`, { method: 'DELETE' });
    if (res.success && res.data) return { success: true, data: res.data.campaign || res.data };
    return res;
  }

  // Admin - Get all tickets
  async getAdminTickets(campaignId?: string): Promise<ApiResponse<Ticket[]>> {
    const qs = campaignId ? `?campaignId=${campaignId}` : '';
    const res = await this.request<any>(`/tickets${qs}`);
    if (res.success && res.data) {
      const list = res.data.tickets || (Array.isArray(res.data) ? res.data : []);
      return { success: true, data: list };
    }
    return { success: res.success, error: res.error, data: [] };
  }

  // Admin - Start draw (prepare + execute)
  async startDraw(campaignId: string): Promise<ApiResponse<any>> {
    // Step 1: prepare
    const prepRes = await this.request<any>('/draws/prepare', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
    if (!prepRes.success || !prepRes.data?.drawId) {
      return { success: false, error: prepRes.error || 'Draw preparation failed' };
    }
    const drawId = prepRes.data.drawId;
    // Step 2: execute
    const execRes = await this.request<any>('/draws/execute', {
      method: 'POST',
      body: JSON.stringify({ drawId }),
    });
    if (!execRes.success) {
      return { success: false, error: execRes.error || 'Draw execution failed' };
    }
    return { success: true, data: { drawId, ...execRes.data } };
  }

  // Admin - Get draws
  async getDraws(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/draws');
    if (res.success && res.data) {
      const list = res.data.draws || (Array.isArray(res.data) ? res.data : []);
      return { success: true, data: list };
    }
    return { success: res.success, error: res.error, data: [] };
  }

  // Live Draw & Real-Time Lottery Chance
  async getLiveDraw(campaignId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/draws/live/${campaignId}`);
  }

  async scheduleLiveDraw(campaignId: string, scheduledDate: string): Promise<ApiResponse<any>> {
    return this.request<any>('/draws/live/schedule', {
      method: 'POST',
      body: JSON.stringify({ campaignId, scheduledDate }),
    });
  }

  async triggerLiveSpin(campaignId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/draws/live/spin', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  }

  async resetLiveDraw(campaignId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/draws/live/reset', {
      method: 'POST',
      body: JSON.stringify({ campaignId }),
    });
  }

  // Vehicles
  async getVehicles(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/vehicles');
    if (res.success && res.data) {
      return { success: true, data: res.data.vehicles || [] };
    }
    return { success: false, error: res.error, data: [] };
  }

  // Admin - Customers & Users
  async getAdminUsers(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/admin/users');
    if (res.success && res.data?.users) return { success: true, data: res.data.users };
    return { success: res.success, error: res.error, data: [] };
  }

  // Admin - KYC Queue
  async getAdminKYCQueue(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/admin/kyc-queue');
    if (res.success && res.data?.kycQueue) return { success: true, data: res.data.kycQueue };
    return { success: res.success, error: res.error, data: [] };
  }

  async approveKYC(id: string, notes?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/kyc/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  async rejectKYC(id: string, rejectionReason: string, notes?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/kyc/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason, notes }),
    });
  }

  // Admin - Payments & Transactions
  async getAdminPayments(): Promise<ApiResponse<{ payments: any[]; orders: any[] }>> {
    const res = await this.request<any>('/admin/payments');
    if (res.success && res.data) {
      return { success: true, data: { payments: res.data.payments || [], orders: res.data.orders || [] } };
    }
    return { success: false, error: res.error, data: { payments: [], orders: [] } };
  }

  // Admin - Winners
  async getAdminWinners(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/winners');
    if (res.success && res.data?.winners) return { success: true, data: res.data.winners };
    return { success: res.success, error: res.error, data: [] };
  }

  // Admin - Fraud Monitor
  async getAdminFraudFlags(): Promise<ApiResponse<any[]>> {
    const res = await this.request<any>('/fraud/flags');
    if (res.success && res.data) {
      const list = res.data.flags || (Array.isArray(res.data) ? res.data : []);
      return { success: true, data: list };
    }
    return { success: res.success, error: res.error, data: [] };
  }

  async getAdminFraudStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/fraud/statistics');
  }

  async resolveFraudFlag(id: string, resolution: string, actionTaken: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/fraud/flags/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolution, actionTaken }),
    });
  }

  // Admin - Audit Logs
  async getAdminAuditLogs(page = 1, limit = 50): Promise<ApiResponse<{ logs: any[]; total: number }>> {
    const res = await this.request<any>(`/audit/logs?page=${page}&limit=${limit}`);
    if (res.success && res.data) {
      return { success: true, data: { logs: res.data.logs || [], total: res.data.total || 0 } };
    }
    return { success: res.success, error: res.error, data: { logs: [], total: 0 } };
  }

  // Admin - Platform Settings
  async getAdminSettings(): Promise<ApiResponse<any>> {
    const res = await this.request<any>('/admin/settings');
    if (res.success && res.data?.settings) return { success: true, data: res.data.settings };
    return res;
  }

  async updateAdminSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const api = new ApiClient();

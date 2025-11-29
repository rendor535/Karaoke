export interface User
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  managerLimitPln: number;
  role: Role;
}

export type Role = 'admin' | 'manager' | 'employee';

export interface Request {
  aiScore: string;
  aiScoreGeneratedAt: string;
  attachments: Attachment[];
  notes: Note[];
  title: string;
  url: string;
  id: number;
  userEmail: string;
  userId: number;
  userName: string;
  managerId: number;
  managerName: string;
  description: string;
  amountPln: number;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// możliwe że, że będzie potrzebne do zmiany w przyszłości
export interface Note {
  authorName: number;
  body: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  fileUrl: string;
  mimeType: string;
}

export type RequestStatus = 'czeka' | 'potwierdzono' | 'odrzucono' | 'zakupione'

export interface PaginatedResponse {
  request: Request[];
  totalPages: number;
  currentPage: number;
  totalRequests: number;
  filters?: {
    status?: RequestStatus;
    minAmount?: number;
    maxAmount?: number;
    dateFrom?: string;
    dateTo?: string;
    searchName?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}
export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  teamId?: string | null;
  managerId?: string | null;
  teamName?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string;
  yearlyAllowance: number;
  isActive: boolean;
  color?: string;
}

export interface LeaveBalance {
  leaveTypeId: string;
  name: string;
  description?: string;
  allowanceDays: number;
  approvedDays: number;
  pendingDays: number;
  availableDays: number;
  color?: string;
}

export interface ApprovalActor {
  id: string;
  fullName: string;
}

export interface ApprovalHistoryItem {
  id: string;
  action: string;
  actor: ApprovalActor;
  comment?: string | null;
  createdAt: string;
}

export interface LeaveRequestEmployee {
  id: string;
  fullName: string;
  email?: string;
  teamId?: string | null;
  teamName?: string | null;
}

export interface LeaveRequestLeaveType {
  id: string;
  name: string;
  color?: string;
  yearlyAllowance?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: LeaveRequestEmployee;
  leaveTypeId: string;
  leaveType: LeaveRequestLeaveType;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: RequestStatus;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  approvalHistory: ApprovalHistoryItem[];
}

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  teamId?: string | null;
  teamName?: string | null;
  balances: Array<{
    name: string;
    availableDays: number;
    approvedDays: number;
    pendingDays: number;
    allowanceDays: number;
  }>;
}

export interface AvailabilityMember {
  id: string;
  fullName: string;
  status: 'AVAILABLE' | 'ON_LEAVE' | 'PENDING' | string;
  leaveType?: string | null;
}

export interface TeamAvailability {
  date: string;
  teamSize: number;
  available: number;
  onLeave: number;
  pending: number;
  members: AvailabilityMember[];
}

export interface CalendarHoliday {
  id: string;
  name: string;
  date: string;
}

export interface CalendarRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: RequestStatus;
  workingDays: number;
  employee: { id: string; fullName: string };
  leaveType: { id: string; name: string; color?: string };
}

export interface CalendarAvailability {
  date: string;
  total: number;
  available: number;
  onLeave: number;
  pending: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  holidays: CalendarHoliday[];
  requests: CalendarRequest[];
  availability: CalendarAvailability[];
}

export interface AdminSettings {
  minNoticeDays: number;
  maxTeamMembersOff: number;
  settings: Array<{ key: string; value: string | number | boolean; description?: string }>;
}

export interface AdminStatistics {
  totalEmployees: number;
  totalManagers: number;
  totalAdmins: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  totalTeams: number;
  leaveTypes: Array<{ name: string; yearlyAllowance: number; isActive: boolean }>;
}

export interface AdminTeam {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  manager: { id: string; fullName: string };
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

export interface CreateHolidayPayload {
  name: string;
  date: string;
}

export interface CreateLeaveTypePayload {
  name: string;
  description: string;
  yearlyAllowance: number;
  isActive: boolean;
}

export type UpdateLeaveTypePayload = Partial<CreateLeaveTypePayload>;

export interface AppError {
  messages: string[];
  status: number;
}

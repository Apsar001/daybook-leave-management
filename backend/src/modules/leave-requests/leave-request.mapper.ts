import { LeaveRequest } from '../../database/entities/leave-request.entity';

export interface LeaveRequestView {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    fullName: string;
    email: string;
    teamId: string | null;
    teamName: string | null;
  };
  leaveTypeId: string;
  leaveType: {
    id: string;
    name: string;
    color: string;
    yearlyAllowance: number;
  };
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: string;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
  approvalHistory: Array<{
    id: string;
    action: string;
    actor: { id: string; fullName: string } | null;
    comment: string | null;
    createdAt: Date;
  }>;
}

export function mapLeaveRequest(request: LeaveRequest): LeaveRequestView {
  const employee = request.employee;
  const leaveType = request.leaveType;
  return {
    id: request.id,
    employeeId: request.employeeId,
    employee: employee
      ? {
          id: employee.id,
          fullName: employee.fullName,
          email: employee.email,
          teamId: employee.teamId,
          teamName: employee.team?.name ?? null,
        }
      : {
          id: request.employeeId,
          fullName: 'Unknown',
          email: '',
          teamId: null,
          teamName: null,
        },
    leaveTypeId: request.leaveTypeId,
    leaveType: leaveType
      ? {
          id: leaveType.id,
          name: leaveType.name,
          color: leaveType.color,
          yearlyAllowance: leaveType.yearlyAllowance,
        }
      : {
          id: request.leaveTypeId,
          name: 'Unknown',
          color: '#4f46e5',
          yearlyAllowance: 0,
        },
    startDate: request.startDate,
    endDate: request.endDate,
    workingDays: request.workingDays,
    reason: request.reason,
    status: request.status,
    comment: request.comment,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    decidedAt: request.decidedAt,
    approvalHistory: (request.approvalHistory ?? []).map((history) => ({
      id: history.id,
      action: history.action,
      actor: history.actor
        ? { id: history.actor.id, fullName: history.actor.fullName }
        : null,
      comment: history.comment,
      createdAt: history.createdAt,
    })),
  };
}

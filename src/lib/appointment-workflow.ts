// src/lib/appointment-workflow.ts
/**
 * Centralized appointment workflow and whiteboard status mapping
 * This ensures consistency between appointment statuses and whiteboard stages
 */

export type AppointmentStatus = 
  | 'pending'           // Initial booking, not yet confirmed
  | 'approved'          // Confirmed by practice, ready for triage
  | 'rejected'          // Declined by practice
  | 'triage'            // Waiting for initial assessment
  | 'active'            // Currently being treated
  | 'in_treatment'      // Actively in treatment room
  | 'completed'         // Finished successfully
  | 'pending_pickup'    // Waiting for owner pickup
  | 'cancelled'         // Cancelled by owner or practice
  | 'no_show';          // Patient didn't arrive

export type WhiteboardStatus = 'triage' | 'active' | 'completed';

export type UrgencyLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Maps appointment status to whiteboard stage
 * This is the single source of truth for status mapping
 */
export const getWhiteboardStatusFromAppointment = (appointmentStatus: AppointmentStatus): WhiteboardStatus => {
  switch (appointmentStatus) {
    // 🟡 TRIAGE STAGE - Waiting for care
    case 'pending':       // Initial booking, waiting for approval
    case 'approved':      // Confirmed appointment, ready for triage
    case 'triage':        // Explicitly in triage queue
      return 'triage';
      
    // 🟠 ACTIVE STAGE - Currently being treated  
    case 'active':        // Actively being seen
    case 'in_treatment':  // In treatment room
      return 'active';
      
    // 🟢 COMPLETED STAGE - Finished/resolved
    case 'completed':     // Successfully finished
    case 'pending_pickup': // Waiting for owner
    case 'cancelled':     // Cancelled appointment
    case 'no_show':       // Patient didn't arrive
      return 'completed';
      
    // ⚪ NOT ON WHITEBOARD - These don't appear on whiteboard
    case 'rejected':      // Declined by practice
    default:
      return 'triage'; // Safe fallback for unknown statuses
  }
};

/**
 * Maps whiteboard stage back to appropriate appointment status
 * Used when dragging items between whiteboard columns
 */
export const getAppointmentStatusFromWhiteboard = (
  whiteboardStatus: WhiteboardStatus, 
  currentStatus?: AppointmentStatus
): AppointmentStatus => {
  switch (whiteboardStatus) {
    case 'triage':
      // If moving back to triage, set as approved (ready for assessment)
      return 'approved';
      
    case 'active':
      // If moving to active, set as in_treatment (actively being seen)
      return 'in_treatment';
      
    case 'completed':
      // If moving to completed, check if it should be pending pickup or completed
      // Default to completed unless specifically coming from active treatment
      if (currentStatus === 'in_treatment' || currentStatus === 'active') {
        return 'pending_pickup'; // May need pickup after treatment
      }
      return 'completed';
      
    default:
      return 'approved'; // Safe fallback
  }
};

/**
 * Determines if an appointment should appear on the whiteboard
 */
export const shouldAppearOnWhiteboard = (appointmentStatus: AppointmentStatus): boolean => {
  return [
    'pending',        // Show pending appointments so staff can approve them
    'approved',
    'triage', 
    'active',
    'in_treatment',
    'completed',
    'pending_pickup'
    // Note: 'rejected', 'cancelled', 'no_show' are excluded as they're terminal states
  ].includes(appointmentStatus);
};

/**
 * Gets urgency level based on appointment type or other factors
 * This can be enhanced with business logic
 */
export const getAppointmentUrgency = (
  appointmentType?: string,
  notes?: string
): UrgencyLevel => {
  // Simple logic - can be enhanced with business rules
  if (appointmentType?.toLowerCase().includes('emergency') || 
      notes?.toLowerCase().includes('urgent')) {
    return 'high';
  }
  
  if (appointmentType?.toLowerCase().includes('surgery') ||
      appointmentType?.toLowerCase().includes('procedure')) {
    return 'medium';
  }
  
  return 'low'; // Default for routine appointments
};

/**
 * Status transition validation
 * Defines which status changes are allowed
 */
export const isValidStatusTransition = (
  from: AppointmentStatus, 
  to: AppointmentStatus
): boolean => {
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    'pending': ['approved', 'rejected', 'cancelled'],
    'approved': ['triage', 'active', 'in_treatment', 'cancelled', 'no_show'],
    'rejected': [], // Terminal state
    'triage': ['active', 'in_treatment', 'cancelled', 'no_show', 'approved'], // Can go back to approved
    'active': ['in_treatment', 'completed', 'pending_pickup', 'triage'], // Can go back to triage
    'in_treatment': ['completed', 'pending_pickup', 'active'], // Can go back to active
    'completed': ['pending_pickup'], // Can move to pickup if needed
    'pending_pickup': ['completed'],
    'cancelled': [], // Terminal state
    'no_show': [], // Terminal state
  };
  
  return validTransitions[from]?.includes(to) ?? false;
};

/**
 * Get human-readable status labels
 */
export const getStatusLabel = (status: AppointmentStatus): string => {
  const labels: Record<AppointmentStatus, string> = {
    'pending': 'Pending Approval',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'triage': 'In Triage',
    'active': 'Active',
    'in_treatment': 'In Treatment',
    'completed': 'Completed',
    'pending_pickup': 'Pending Pickup',
    'cancelled': 'Cancelled',
    'no_show': 'No Show'
  };
  
  return labels[status] || status;
};

/**
 * Get status colors for UI
 */
export const getStatusColor = (status: AppointmentStatus): {
  bg: string;
  text: string;
  border: string;
} => {
  const colors: Record<AppointmentStatus, { bg: string; text: string; border: string }> = {
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    'approved': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'rejected': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    'triage': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    'active': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    'in_treatment': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    'completed': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    'pending_pickup': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    'cancelled': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    'no_show': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
  };
  
  return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
};

export type ActivityDomain = 'employees' | 'leave' | 'time';

/**
 * Cross-domain event shown in the dashboard recent-activity feed.
 * Lives in shared because it aggregates over domains and belongs to no single one.
 */
export interface ActivityEvent {
  id: string;
  domain: ActivityDomain;
  message: string;
  timestamp: string;
  status?: 'pending' | 'approved' | 'rejected';
}

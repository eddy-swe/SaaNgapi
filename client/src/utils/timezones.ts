/**
 * Detect the user's local browser timezone
 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

/**
 * Common popular timezones organized for intuitive selection
 */
export const COMMON_TIMEZONES = [
  { label: 'Pacific Time (US & Canada)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (US & Canada)', value: 'America/Denver' },
  { label: 'Central Time (US & Canada)', value: 'America/Chicago' },
  { label: 'Eastern Time (US & Canada)', value: 'America/New_York' },
  { label: 'Greenwich Mean Time / UTC', value: 'UTC' },
  { label: 'London, Dublin, Lisbon (GMT/BST)', value: 'Europe/London' },
  { label: 'Central European Time (Paris, Berlin, Rome)', value: 'Europe/Paris' },
  { label: 'Eastern European Time (Athens, Helsinki, Cairo)', value: 'Europe/Athens' },
  { label: 'East Africa Time (Nairobi, Addis Ababa)', value: 'Africa/Nairobi' },
  { label: 'South Africa Standard Time (Johannesburg)', value: 'Africa/Johannesburg' },
  { label: 'West Africa Time (Lagos, Accra)', value: 'Africa/Lagos' },
  { label: 'Dubai, UAE (GST)', value: 'Asia/Dubai' },
  { label: 'India Standard Time (New Delhi, Mumbai)', value: 'Asia/Kolkata' },
  { label: 'Singapore, Hong Kong, Beijing (SGT/CST)', value: 'Asia/Singapore' },
  { label: 'Tokyo, Japan (JST)', value: 'Asia/Tokyo' },
  { label: 'Australian Eastern Time (Sydney, Melbourne)', value: 'Australia/Sydney' },
  { label: 'New Zealand Time (Auckland, Wellington)', value: 'Pacific/Auckland' },
  { label: 'Hawaii Time (Honolulu)', value: 'Pacific/Honolulu' },
  { label: 'Brazil / Sao Paulo Time', value: 'America/Sao_Paulo' }
];

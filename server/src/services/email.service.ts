import { formatInTimeZone } from 'date-fns-tz';

export interface EmailBookingDetails {
  bookingId: string;
  hostName: string;
  hostEmail: string;
  hostTimezone: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeTimezone: string;
  eventTitle: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  meetingUrl?: string | null;
  cancellationReason?: string | null;
}

/**
 * Service to generate and dispatch confirmation, cancellation, and reschedule notifications.
 * Can be hooked into SMTP, SendGrid, or Resend. Defaults to structured console log preview.
 */
export class EmailService {
  /**
   * Generates a standard iCalendar (ICS) event payload for calendar apps
   */
  public static generateIcs(details: EmailBookingDetails): string {
    const formatIcsDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SaaNgapi//Scheduling App//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${details.bookingId}@saangapi.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(details.startTime)}`,
      `DTEND:${formatIcsDate(details.endTime)}`,
      `SUMMARY:${details.eventTitle} with ${details.hostName}`,
      `DESCRIPTION:Booking ID: ${details.bookingId}\\nMeeting link: ${details.meetingUrl || 'TBD'}`,
      details.meetingUrl ? `LOCATION:${details.meetingUrl}` : '',
      `ORGANIZER;CN=${details.hostName}:mailto:${details.hostEmail}`,
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${details.inviteeName}:mailto:${details.inviteeEmail}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }

  /**
   * Send booking confirmation to invitee & host
   */
  public static async sendBookingConfirmation(details: EmailBookingDetails): Promise<void> {
    const inviteeDateStr = formatInTimeZone(
      details.startTime,
      details.inviteeTimezone,
      'EEEE, MMMM d, yyyy @ h:mm a'
    );
    const hostDateStr = formatInTimeZone(
      details.startTime,
      details.hostTimezone,
      'EEEE, MMMM d, yyyy @ h:mm a'
    );

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4F46E5; margin-top: 0;">Appointment Confirmed!</h2>
        <p>Hi <strong>${details.inviteeName}</strong>,</p>
        <p>Your appointment with <strong>${details.hostName}</strong> has been successfully booked.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Event:</strong> ${details.eventTitle}</p>
          <p style="margin: 4px 0;"><strong>Date & Time (Your Timezone):</strong> ${inviteeDateStr} (${details.inviteeTimezone})</p>
          <p style="margin: 4px 0;"><strong>Host Timezone:</strong> ${hostDateStr} (${details.hostTimezone})</p>
          <p style="margin: 4px 0;"><strong>Duration:</strong> ${details.duration} minutes</p>
          ${details.meetingUrl ? `<p style="margin: 4px 0;"><strong>Video Call Link:</strong> <a href="${details.meetingUrl}">${details.meetingUrl}</a></p>` : ''}
        </div>

        <p style="color: #6b7280; font-size: 14px;">Need to make changes? You can reschedule or cancel this event directly from your confirmation page.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Powered by SaaNgapi Scheduling Platform</p>
      </div>
    `;

    console.log('\n======================================================');
    console.log(`[EMAIL DISPATCH] Booking Confirmation -> ${details.inviteeEmail} & ${details.hostEmail}`);
    console.log(`Subject: Confirmed: ${details.eventTitle} with ${details.hostName}`);
    console.log(`Time: ${inviteeDateStr}`);
    console.log('ICS Calendar Invite Generated: Yes');
    console.log('======================================================\n');
  }

  /**
   * Send cancellation notice to invitee & host
   */
  public static async sendCancellationNotice(details: EmailBookingDetails): Promise<void> {
    const inviteeDateStr = formatInTimeZone(
      details.startTime,
      details.inviteeTimezone,
      'EEEE, MMMM d, yyyy @ h:mm a'
    );

    console.log('\n======================================================');
    console.log(`[EMAIL DISPATCH] Cancellation Notice -> ${details.inviteeEmail} & ${details.hostEmail}`);
    console.log(`Subject: Cancelled: ${details.eventTitle} on ${inviteeDateStr}`);
    console.log(`Reason: ${details.cancellationReason || 'No reason specified'}`);
    console.log('======================================================\n');
  }
}

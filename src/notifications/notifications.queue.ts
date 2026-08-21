export const NOTIFICATIONS_QUEUE = 'notifications';
export const SEND_CONFIRMATION_JOB = 'send-confirmation';

export interface SendConfirmationJobData {
  eventId: string;
  orderId: string;
}

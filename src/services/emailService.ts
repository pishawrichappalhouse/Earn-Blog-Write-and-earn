import emailjs from '@emailjs/browser';

// These should be configured in .env
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_default';
const TEMPLATE_ID_ADMIN = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_admin';
const TEMPLATE_ID_USER = import.meta.env.VITE_EMAILJS_USER_TEMPLATE_ID || 'template_user';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

export const notifyAdminNewWithdrawal = async (data: {
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  details: string;
}) => {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID_ADMIN,
      {
        to_email: 'pishawrichappalhouse@gmail.com',
        from_name: 'BlogEarn System',
        user_name: data.userName,
        user_email: data.userEmail,
        amount: data.amount,
        method: data.method,
        details: data.details,
        message: `New withdrawal request of ${data.amount} coins from ${data.userName}.`
      },
      PUBLIC_KEY
    );
    console.log('Admin notified successfully');
  } catch (error) {
    console.error('Failed to notify admin:', error);
  }
};

export const notifyUserWithdrawalStatus = async (data: {
  userEmail: string;
  userName: string;
  amount: number;
  status: 'approved' | 'rejected';
  reason?: string;
}) => {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID_USER,
      {
        to_email: data.userEmail,
        to_name: data.userName,
        amount: data.amount,
        status: data.status,
        reason: data.reason || 'N/A',
        message: `Your withdrawal request of ${data.amount} coins has been ${data.status}.`
      },
      PUBLIC_KEY
    );
    console.log('User notified successfully');
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
};

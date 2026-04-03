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
  accountName: string;
  accountNumber?: string;
  iban?: string;
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
        account_name: data.accountName,
        account_number: data.accountNumber || data.iban || 'N/A',
        details: data.details,
        message: `New withdrawal request of ${data.amount} coins from ${data.userName}. Account: ${data.accountName} (${data.method})`
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
  rejectionReason?: string;
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
        reason: data.rejectionReason || 'N/A',
        message: `Your withdrawal request of ${data.amount} coins has been ${data.status}.${data.status === 'rejected' && data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`
      },
      PUBLIC_KEY
    );
    console.log('User notified successfully');
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
};

export const notifyAdminWithdrawalProcessed = async (data: {
  userName: string;
  userEmail: string;
  amount: number;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
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
        status: data.status,
        reason: data.rejectionReason || 'N/A',
        message: `Withdrawal request of ${data.amount} coins from ${data.userName} has been ${data.status}.${data.status === 'rejected' && data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`
      },
      PUBLIC_KEY
    );
    console.log('Admin notified of processed withdrawal');
  } catch (error) {
    console.error('Failed to notify admin of processed withdrawal:', error);
  }
};

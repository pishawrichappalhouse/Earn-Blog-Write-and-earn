import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  LayoutDashboard, 
  PenSquare, 
  TrendingUp, 
  User, 
  LogOut, 
  Search, 
  Bell, 
  Menu, 
  X,
  Eye,
  DollarSign,
  Clock,
  ChevronRight,
  ArrowRight,
  Share2,
  ThumbsUp,
  MessageSquare,
  Shield,
  Trash2,
  CheckCircle,
  History,
  Settings,
  ExternalLink,
  Plus,
  Wallet,
  AlertCircle,
  Check,
  Ban,
  Database,
  Users,
  Edit2,
  Mail,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  increment,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { notifyAdminNewWithdrawal, notifyUserWithdrawalStatus, notifyAdminWithdrawalProcessed, notifyUserPostStatus } from './services/emailService';
import { cn } from './lib/utils';

// --- Types ---

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  coins: number;
  totalEarned: number;
  role: 'user' | 'admin';
  membership?: {
    plan?: 'Pro' | 'Super Pro' | 'Legend Pro' | null;
    status: 'none' | 'pending' | 'approved';
    badge?: string;
    expiresAt?: any;
  };
  createdAt: any;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorBadge?: string;
  authorRole?: string;
  category: string;
  thumbnail?: string;
  views: number;
  likes?: number;
  likedBy?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  amount: number;
  method: 'JazzCash' | 'EasyPaisa' | 'Bank';
  accountName: string;
  accountNumber?: string;
  iban?: string;
  details: string;
  status: 'pending' | 'approved' | 'cancelled';
  rejectionReason?: string;
  createdAt: any;
}

interface Deposit {
  id: string;
  userId: string;
  userName: string;
  planName: 'Pro' | 'Super Pro' | 'Legend Pro';
  amount: number;
  trxId: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface PlatformSettings {
  coinValuePerView: number;
  minWithdrawal: number;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userBadge?: string;
  userRole?: string;
  content: string;
  createdAt: any;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'withdrawal_approved' | 'withdrawal_cancelled' | 'post_approved' | 'post_rejected';
  read: boolean;
  createdAt: any;
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Permission Error at ${path}: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

// --- Context ---

const AdEligibilityContext = createContext<{
  isEligible: boolean;
  setIsEligible: (eligible: boolean) => void;
}>({ isEligible: true, setIsEligible: () => {} });

const useAdEligibility = () => useContext(AdEligibilityContext);

const AdEligibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const [isEligible, setIsEligible] = useState(true);
  const location = useLocation();

  // Reset eligibility on route change
  useEffect(() => {
    setIsEligible(true);
  }, [location.pathname]);

  return (
    <AdEligibilityContext.Provider value={{ isEligible, setIsEligible }}>
      {children}
    </AdEligibilityContext.Provider>
  );
};

const AuthContext = createContext<{
  user: UserProfile | null;
  loading: boolean;
  settings: PlatformSettings;
} | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const isAdAllowed = (pathname: string) => {
  // Strictly allow ads only on Home and Blog Post pages
  const isHome = pathname === '/';
  const isPost = pathname.startsWith('/post/');
  const isCategory = pathname.startsWith('/category/');
  
  return isHome || isPost || isCategory;
};

const StickyAd = () => {
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();
  const { isEligible } = useAdEligibility();
  
  if (!isVisible || !isAdAllowed(location.pathname) || !isEligible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none">
      <div className="max-w-4xl mx-auto relative pointer-events-auto">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-orange-600 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-2">
          <AdBanner position="inline" />
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const Comments = ({ postId }: { postId: string }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`));

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL || '',
        userBadge: user.membership?.badge || null,
        userRole: user.role,
        content: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
      toast.success('Comment deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  return (
    <div className="mt-12 pt-12 border-t border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-orange-500" />
        Comments ({comments.length})
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-12">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none min-h-[100px] resize-none transition-all"
                maxLength={1000}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-8 bg-gray-50 rounded-3xl text-center mb-12">
          <p className="text-gray-600 mb-4">Please sign in to leave a comment.</p>
          <Link to="/login" className="inline-block px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all">
            Sign In
          </Link>
        </div>
      )}

      <div className="space-y-8">
        {comments.map((comment) => (
          <div key={comment.id} className="group flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              {comment.userPhoto ? (
                <img src={comment.userPhoto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{comment.userName}</span>
                    <AuthorBadge badge={comment.userBadge} role={comment.userRole} />
                    <span className="text-xs text-gray-400">
                      {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                    </span>
                  </div>
                </div>
                {(user?.role === 'admin' || user?.uid === comment.userId) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-700 leading-relaxed">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationListener = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
          const now = new Date().getTime();
          const createdAt = notification.createdAt?.toMillis?.() || now;
          
          // Only show toast for very recent notifications (within last 30 seconds)
          if (now - createdAt < 30000) {
            toast.success(notification.title, {
              description: notification.message,
              duration: 10000,
              action: {
                label: 'Mark as Read',
                onClick: () => updateDoc(doc(db, 'notifications', change.doc.id), { read: true })
              }
            });
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'));

    return () => unsubscribe();
  }, [user]);

  return null;
};

const MembershipNotice = () => (
  <div className="bg-orange-50 border-y border-orange-100 py-3 px-4 text-center">
    <p className="text-sm font-medium text-orange-800 flex items-center justify-center gap-2">
      <Shield className="w-4 h-4" />
      This is a membership system, not a financial investment platform.
    </p>
  </div>
);

const PlanGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin' && user.membership?.status !== 'approved') {
      navigate('/membership');
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user) {
    navigate('/login');
    return null;
  }
  
  if (user.role !== 'admin' && user.membership?.status !== 'approved') {
    return null;
  }

  return <>{children}</>;
};

const Membership = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Pro',
      price: 400,
      badge: 'Pro',
      features: ['3 Months Validity', 'Unlock Blog Posting', 'Pro Badge', 'Standard Support'],
      color: 'blue'
    },
    {
      name: 'Super Pro',
      price: 800,
      badge: 'Super Pro',
      features: ['3 Months Validity', 'Unlock Blog Posting', 'Super Pro Badge', 'Priority Support', 'Featured Posts'],
      color: 'orange',
      recommended: true
    },
    {
      name: 'Legend Pro',
      price: 1500,
      badge: 'Legend Pro',
      features: ['3 Months Validity', 'Unlock Blog Posting', 'Legend Pro Badge', '24/7 Support', 'Verified Status', 'Revenue Share'],
      color: 'purple'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <MembershipNotice />
      <div className="text-center mb-16 mt-8">
        <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Membership Plans</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
          Upgrade your account to unlock premium features and start sharing your insights with the world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            whileHover={{ y: -10 }}
            className={cn(
              "relative bg-white rounded-[40px] p-8 shadow-xl border-2 transition-all duration-300",
              plan.recommended ? "border-orange-500 scale-105 z-10" : "border-gray-100 hover:border-gray-200"
            )}
          >
            {plan.recommended && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg badge-shine">
                Recommended
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">Rs {plan.price}</span>
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">/ 3 Months</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-gray-600 font-medium">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    plan.recommended ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate(`/deposit?plan=${plan.name}`)}
              disabled={user?.membership?.plan === plan.name && user?.membership?.status !== 'none'}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-lg",
                plan.recommended 
                  ? "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200" 
                  : "bg-gray-900 text-white hover:bg-gray-800 shadow-gray-200",
                user?.membership?.plan === plan.name && user?.membership?.status !== 'none' && "opacity-50 cursor-not-allowed"
              )}
            >
              {user?.membership?.plan === plan.name && user?.membership?.status === 'approved' ? 'Current Plan' : 
               user?.membership?.plan === plan.name && user?.membership?.status === 'pending' ? 'Pending Approval' : 'Select Plan'}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 bg-gray-900 rounded-[40px] p-12 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        <h2 className="text-3xl font-black mb-4 relative z-10">Need a custom plan?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto relative z-10">
          Contact our support team for enterprise solutions and bulk membership options.
        </p>
        <Link to="/contact" className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all relative z-10">
          Contact Support <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

const Deposit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useLocation().search.split('?');
  const planFromUrl = new URLSearchParams(window.location.search).get('plan');
  
  const [plan, setPlan] = useState(planFromUrl || 'Pro');
  const [trxId, setTrxId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plans = {
    'Pro': 400,
    'Super Pro': 800,
    'Legend Pro': 1500
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!trxId || !screenshotPreview) {
      toast.error('Please fill all fields and upload screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const depositId = `dep_${Date.now()}`;
      const depositData: Deposit = {
        id: depositId,
        userId: user.uid,
        userName: user.displayName,
        planName: plan as any,
        amount: plans[plan as keyof typeof plans],
        trxId,
        screenshotUrl: screenshotPreview, // In a real app, upload to storage first
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'deposits', depositId), depositData);
      
      // Update user status to pending
      await updateDoc(doc(db, 'users', user.uid), {
        'membership.status': 'pending',
        'membership.plan': plan
      });

      toast.success('Your Deposit Request Is Submited');
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deposits');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <div className="bg-white rounded-[40px] p-12 shadow-xl border border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Submit Deposit</h1>
        
        <div className="bg-orange-50 rounded-3xl p-8 mb-10 border border-orange-100">
          <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Payment Instructions (JazzCash)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
              <span className="text-orange-700 font-medium">Account Name</span>
              <span className="text-orange-900 font-black">Yasmin Ruksana</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-orange-200/50">
              <span className="text-orange-700 font-medium">Account Number</span>
              <span className="text-orange-900 font-black">03378344957</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-orange-700 font-medium">Amount to Pay</span>
              <span className="text-orange-900 font-black text-xl">Rs {plans[plan as keyof typeof plans]}</span>
            </div>
          </div>
          <p className="mt-6 text-xs text-orange-600 font-bold uppercase tracking-widest leading-relaxed">
            * Please send the exact amount to the account above. After payment, capture a screenshot and note down the Transaction ID (TRX ID).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Select Plan</label>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(plans).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={cn(
                    "py-4 rounded-2xl font-bold text-sm transition-all border-2",
                    plan === p 
                      ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200" 
                      : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Transaction ID (TRX ID)</label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="Enter 11-digit TRX ID"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Payment Screenshot</label>
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="screenshot-upload"
                required
              />
              <label
                htmlFor="screenshot-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-[32px] cursor-pointer transition-all overflow-hidden",
                  screenshotPreview ? "border-orange-500 bg-orange-50/30" : "border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
                )}
              >
                {screenshotPreview ? (
                  <img src={screenshotPreview} alt="Preview" className="w-full h-full object-contain max-h-[300px]" />
                ) : (
                  <div className="flex flex-col items-center py-10">
                    <Plus className="w-10 h-10 text-gray-300 mb-4" />
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Upload Screenshot</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Deposit'}
            </button>
            <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest mt-6">
              Plan will be activated after BPA approval
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const AuthorBadge = ({ badge, role, className }: { badge?: string; role?: string; className?: string }) => {
  if (role === 'admin') {
    return (
      <span className={cn(
        "bg-purple-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter badge-shine",
        className
      )}>
        Blogger Pro Admin
      </span>
    );
  }
  if (badge) {
    return (
      <span className={cn(
        "bg-orange-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter badge-shine",
        className
      )}>
        {badge}
      </span>
    );
  }
  return null;
};

const Navbar = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') {
      const qPosts = query(collection(db, 'posts'), where('status', '==', 'pending'));
      const qWithdrawals = query(collection(db, 'withdrawals'), where('status', '==', 'pending'));
      
      const unsubPosts = onSnapshot(qPosts, (snap) => {
        const postsCount = snap.size;
        const unsubWithdrawals = onSnapshot(qWithdrawals, (snapW) => {
          setPendingCount(postsCount + snapW.size);
        });
        return () => unsubWithdrawals();
      });
      return () => unsubPosts();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadNotifications(snapshot.size);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0F172A] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-orange-900/20 group-hover:scale-105 transition-transform duration-300">
                B
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white leading-none">BloggerPro</span>
                <span className="text-[8px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-1">Insights & Knowledge</span>
              </div>
            </Link>
            
            <div className="hidden lg:flex items-center gap-6">
              <Link to="/" className="text-xs font-semibold text-gray-300 hover:text-white transition-colors">Home</Link>
              
              <div className="relative group/cat">
                <button className="text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                  Categories <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/cat:opacity-100 group-hover/cat:visible transition-all duration-200 py-2">
                  <Link to="/category/Technology" className="block px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Technology</Link>
                  <Link to="/category/Earning" className="block px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Earning</Link>
                  <Link to="/category/Lifestyle" className="block px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors">Lifestyle</Link>
                </div>
              </div>

              <Link to="/membership" className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Membership
              </Link>
              <Link to="/about" className="text-xs font-semibold text-gray-300 hover:text-white transition-colors">About</Link>
              <Link to="/contact" className="text-xs font-semibold text-gray-300 hover:text-white transition-colors">Contact</Link>
              <Link to="/privacy" className="text-xs font-semibold text-gray-300 hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search articles..." 
                className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-sm w-48 focus:w-64 focus:bg-white/10 focus:outline-none transition-all duration-300 placeholder:text-gray-500"
              />
              <Search className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            {user ? (
              <div className="flex items-center gap-5">
                {(user.role === 'admin' || user.membership?.status === 'approved') && (
                  <Link 
                    to="/create" 
                    className="bg-orange-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </Link>
                )}
                <div className="h-8 w-[1px] bg-white/10 mx-1" />
                {(user.role === 'admin' || user.membership?.status === 'approved') && (
                  <Link to="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-transparent group-hover:border-orange-500 transition-all shadow-inner relative">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-5 h-5" /></div>}
                      </div>
                      {(user.role === 'admin' || (user.membership?.plan && user.membership?.status === 'approved')) && (
                        <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0F172A] shadow-sm badge-shine z-10">
                          {user.role === 'admin' ? 'BPA' : (user.membership?.plan === 'Pro' ? 'P' : user.membership?.plan === 'Super Pro' ? 'SP' : 'LP')}
                        </div>
                      )}
                    </div>
                    <div className="hidden xl:block">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white leading-none">{user.displayName}</p>
                        {user.role === 'admin' ? (
                          <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter badge-shine">
                            Blogger Pro Admin
                          </span>
                        ) : user.membership?.badge && (
                          <span className="bg-orange-600 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter badge-shine">
                            {user.membership.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-orange-500 font-bold mt-1">{user.coins.toFixed(0)} Coins</p>
                    </div>
                  </Link>
                )}

                {(user.role === 'admin' || user.membership?.status === 'approved') && (
                  <div className="relative">
                    <Link 
                      to="/dashboard" 
                      className="p-2.5 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center"
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0F172A]">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl hover:bg-purple-600/30 transition-all border border-purple-500/30 flex items-center gap-2 relative"
                    title="BPA Panel"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-xs font-bold hidden xl:block">BPA</span>
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0F172A] animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                )}
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-white text-gray-900 px-8 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-all shadow-lg shadow-white/5"
              >
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-300">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-[#0F172A] border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Link to="/" className="p-4 bg-white/5 rounded-2xl text-xs font-bold text-white text-center">Home</Link>
                <Link to="/membership" className="p-4 bg-white/5 rounded-2xl text-xs font-bold text-orange-500 text-center">Membership</Link>
                <Link to="/about" className="p-4 bg-white/5 rounded-2xl text-xs font-bold text-white text-center">About</Link>
                <Link to="/contact" className="p-4 bg-white/5 rounded-2xl text-xs font-bold text-white text-center">Contact</Link>
                <Link to="/privacy" className="p-4 bg-white/5 rounded-2xl text-xs font-bold text-white text-center col-span-2">Privacy</Link>
              </div>
              
              {user ? (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/10 relative">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400 m-3" />}
                      </div>
                      {(user.role === 'admin' || (user.membership?.plan && user.membership?.status === 'approved')) && (
                        <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0F172A] shadow-sm badge-shine z-10">
                          {user.role === 'admin' ? 'BPA' : (user.membership?.plan === 'Pro' ? 'P' : user.membership?.plan === 'Super Pro' ? 'SP' : 'LP')}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{user.displayName}</p>
                      <p className="text-sm text-orange-500 font-bold">{user.coins.toFixed(0)} Coins</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="flex items-center justify-between p-4 bg-purple-600/20 rounded-2xl text-purple-400 font-bold border border-purple-500/30">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5" /> BPA Panel
                      </div>
                      {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                          {pendingCount} Pending
                        </span>
                      )}
                    </Link>
                  )}
                  {(user.role === 'admin' || user.membership?.status === 'approved') && (
                    <>
                      <Link to="/dashboard" className="block text-lg font-bold text-white">Dashboard</Link>
                      <Link to="/create" className="block text-lg font-bold text-orange-500">Create Post</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="block text-lg font-bold text-red-500">Logout</button>
                </div>
              ) : (
                <Link to="/login" className="block w-full py-4 bg-orange-600 rounded-2xl text-center font-bold text-white">Sign In</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#0F172A] text-white pt-20 pb-10 border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-white">BloggerPro</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              BloggerPro – Insights & Knowledge is a professional platform dedicated to blogging tips, online earning, and knowledge sharing.
            </p>
            <div className="flex items-center gap-4">
              {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map(social => (
                <a key={social} href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-orange-600 transition-colors">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-gray-400 rounded-sm" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 tracking-tight">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Home</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Contact Us</Link></li>
              <li><Link to="/membership" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Membership Plans</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 tracking-tight">Support</h4>
            <ul className="space-y-4">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Privacy Policy</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Help Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6 tracking-tight">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-6">Get the latest stories and insights delivered to your inbox.</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed successfully!'); }}>
              <input 
                type="email" 
                required
                placeholder="Email address" 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm flex-1 focus:outline-none focus:border-orange-500"
              />
              <button type="submit" className="bg-orange-600 p-2 rounded-xl hover:bg-orange-700 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <AdBanner position="footer" />

        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <p className="text-gray-500 text-xs font-medium">
              © 2026 BloggerPro. All rights reserved.
            </p>
            <p className="text-[10px] text-gray-600 max-w-md leading-relaxed font-medium">
              Disclaimer: This is a membership system, not a financial investment platform. We provide educational content and a platform for knowledge sharing.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
            <span>Safe & Professional</span>
            <span>AdSense Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const pushedElements = new WeakSet<HTMLElement>();

const AdBanner = ({ position }: { position: 'top' | 'sidebar' | 'footer' | 'inline' }) => {
  const location = useLocation();
  const { isEligible } = useAdEligibility();
  const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-7554219557678246';
  const slotId = import.meta.env.VITE_ADSENSE_SLOT_ID || '3774238446';
  const adRef = React.useRef<HTMLModElement>(null);
  
  useEffect(() => {
    if (!isAdAllowed(location.pathname) || !isEligible) return;
    // In a SPA with React StrictMode, components mount twice in development.
    // This can cause multiple adsbygoogle.push() calls for the same slot,
    // leading to the "All 'ins' elements... already have ads in them" error.
    // Using a timeout that is cleared on unmount ensures we only push once
    // when the component is actually staying in the DOM.
    const tryPushAd = (retries = 0) => {
      if (retries > 5) return; // Stop after 5 retries

      try {
        if (adRef.current && 
            adRef.current.offsetWidth > 0 &&
            !pushedElements.has(adRef.current) && 
            !adRef.current.hasAttribute('data-adsbygoogle-status') && 
            adRef.current.innerHTML === '') {
          
          pushedElements.add(adRef.current);
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } else if (adRef.current && adRef.current.offsetWidth === 0) {
          // If width is 0, wait and try again
          setTimeout(() => tryPushAd(retries + 1), 500);
        }
      } catch (e) {
        // Silently catch common AdSense race condition errors
        if (e instanceof Error && 
            !e.message.includes('already have ads') && 
            !e.message.includes('No slot size')) {
          console.error('AdSense error:', e);
        }
      }
    };

    const timeoutId = setTimeout(() => tryPushAd(), 500);

    return () => clearTimeout(timeoutId);
  }, [position, location.pathname]);

  // Hide ads on excluded pages or if not eligible
  if (!isAdAllowed(location.pathname) || !isEligible) return null;

  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('run.app');

  return (
    <div className={cn(
      "my-8 flex justify-center overflow-hidden relative",
      position === 'sidebar' ? "min-h-[250px]" : "min-h-[90px]"
    )}>
      {isDev && (
        <div className="absolute inset-0 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 z-0">
          <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Ad Space ({position})</span>
          <span className="text-[8px] opacity-60">{publisherId}</span>
        </div>
      )}
      <ins ref={adRef}
           className="adsbygoogle relative z-10"
           style={{ display: 'block', width: '100%' }}
           data-ad-client={publisherId}
           data-ad-slot={slotId}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

// --- Pages ---

const Sidebar = ({ popularPosts }: { popularPosts: BlogPost[] }) => {
  const categories = ['Technology', 'Earning', 'Lifestyle'];
  
  return (
    <aside className="space-y-12">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Search className="w-5 h-5 text-orange-500" />
          Search
        </h3>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search articles..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AdBanner position="sidebar" />

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Popular Posts
        </h3>
        <div className="space-y-6">
          {popularPosts.map((post, index) => (
            <Link key={post.id} to={`/post/${post.id}`} className="flex gap-4 group">
              <span className="text-2xl font-black text-gray-100 group-hover:text-orange-100 transition-colors">0{index + 1}</span>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{post.category}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Menu className="w-5 h-5 text-orange-500" />
          Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <Link 
              key={cat} 
              to={`/category/${cat}`}
              className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-orange-500 hover:text-white transition-all border border-gray-100"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-3xl text-white shadow-xl shadow-orange-900/20">
        <h3 className="text-xl font-bold mb-4">Share Knowledge</h3>
        <p className="text-orange-100 text-sm mb-6 leading-relaxed">Join our community of writers and share your unique perspective with the world.</p>
        <Link to="/create" className="block w-full py-3 bg-white text-orange-600 rounded-2xl text-center font-bold text-sm hover:bg-orange-50 transition-colors">
          Start Writing
        </Link>
      </div>
    </aside>
  );
};

const Home = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { setIsEligible } = useAdEligibility();

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      where('status', '==', 'approved'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      setPosts(fetchedPosts);
      setIsEligible(fetchedPosts.length > 0);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => unsubscribe();
  }, [setIsEligible]);

  const { user } = useAuth();
  const featuredPosts = posts.slice(0, 3);
  const latestPosts = posts.slice(3);
  const popularPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, 5);
  const categories = ['Technology', 'Earning', 'Lifestyle'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {user && user.role !== 'admin' && user.membership?.status !== 'approved' && (
        <div className="mb-12 bg-orange-600 text-white p-8 rounded-[40px] shadow-2xl shadow-orange-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1 tracking-tight">Membership Required</h2>
              <p className="text-orange-100 font-medium">Upgrade your account to start sharing stories and earning coins.</p>
            </div>
          </div>
          <Link to="/membership" className="bg-white text-orange-600 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-50 transition-all shadow-xl">
            View Plans
          </Link>
        </div>
      )}
      <MembershipNotice />

      {/* Hero Section */}
      <section className="py-16 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Learn, Explore, and <br />
            <span className="text-orange-600">Share Knowledge</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium">
            Discover insightful articles, expert opinions, and helpful guides from our global community of writers.
          </p>
        </motion.div>
      </section>

      {/* Category Navigation */}
      <div className="flex items-center gap-4 overflow-x-auto pb-8 no-scrollbar">
        {['All', ...categories].map((cat) => (
          <Link
            key={cat}
            to={cat === 'All' ? '/' : `/category/${cat}`}
            className="px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm whitespace-nowrap"
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Featured Grid */}
      <section className="mb-20">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Featured Stories</h2>
          <div className="h-[2px] bg-gray-100 flex-1" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {featuredPosts[0] && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8 group"
            >
              <Link to={`/post/${featuredPosts[0].id}`} className="block relative aspect-[16/9] rounded-[40px] overflow-hidden shadow-2xl">
                <img 
                  src={featuredPosts[0].thumbnail || 'https://picsum.photos/seed/tech/1200/800'} 
                  alt={featuredPosts[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-10 md:p-16 space-y-4">
                  <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {featuredPosts[0].category}
                  </span>
                  <h3 className="text-3xl md:text-5xl font-black text-white leading-tight max-w-2xl">
                    {featuredPosts[0].title}
                  </h3>
                  <div className="flex items-center gap-4 text-gray-300 text-sm font-medium">
                    <div className="flex flex-col">
                      <span>{featuredPosts[0].authorName}</span>
                      <AuthorBadge badge={featuredPosts[0].authorBadge} role={featuredPosts[0].authorRole} className="mt-0.5" />
                    </div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full" />
                    <span>{featuredPosts[0].createdAt?.toDate ? format(featuredPosts[0].createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          <div className="lg:col-span-4 space-y-8">
            {featuredPosts.slice(1).map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="group"
              >
                <Link to={`/post/${post.id}`} className="block relative aspect-[4/3] rounded-[32px] overflow-hidden shadow-xl">
                  <img 
                    src={post.thumbnail || 'https://picsum.photos/seed/blog/800/600'} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 space-y-3">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest rounded-full">
                      {post.category}
                    </span>
                    <h3 className="text-xl font-bold text-white leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{post.authorName}</span>
                      <AuthorBadge badge={post.authorBadge} role={post.authorRole} className="mt-0.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {posts.length > 0 && <AdBanner position="inline" />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Latest Posts */}
        <div className="lg:col-span-8 space-y-12">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Latest Articles</h2>
            <div className="h-[2px] bg-gray-100 flex-1" />
          </div>

          <div className="space-y-10">
            {latestPosts.map((post, index) => (
              <React.Fragment key={post.id}>
                <motion.article 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex flex-col md:flex-row gap-8 group"
                >
                  <Link to={`/post/${post.id}`} className="md:w-72 aspect-[4/3] rounded-3xl overflow-hidden shadow-lg flex-shrink-0">
                    <img 
                      src={post.thumbnail || `https://picsum.photos/seed/${post.id}/600/400`} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <div className="flex-1 space-y-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">{post.category}</span>
                      <div className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                      </span>
                    </div>
                    <Link to={`/post/${post.id}`}>
                      <h3 className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                      {post.content.replace(/<[^>]*>/g, '').substring(0, 180)}...
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {post.authorName[0]}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{post.authorName}</span>
                          <AuthorBadge badge={post.authorBadge} role={post.authorRole} className="mt-0.5" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                          <Eye className="w-3.5 h-3.5" /> {post.views}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
                {(index + 1) % 3 === 0 && <AdBanner position="inline" />}
              </React.Fragment>
            ))}
            {latestPosts.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">No more articles to show.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <Sidebar popularPosts={popularPosts} />
        </div>

        {/* Category Sections */}
        <div className="lg:col-span-12 space-y-24 mt-24">
          {categories.map((category) => {
            const categoryPosts = posts.filter(p => p.category === category).slice(0, 5);
            if (categoryPosts.length === 0) return null;

            return (
              <section key={category} className="space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{category}</h2>
                    <div className="h-[2px] bg-gray-100 flex-1" />
                  </div>
                  <Link to={`/category/${category}`} className="ml-6 text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-2 group">
                    View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                  {categoryPosts.map((post) => (
                    <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      className="group"
                    >
                      <Link to={`/post/${post.id}`} className="block space-y-4">
                        <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-md">
                          <img 
                            src={post.thumbnail || `https://picsum.photos/seed/${category}/600/400`} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-xs text-gray-400 font-medium">
                            {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicy = () => (
  <div className="max-w-4xl mx-auto px-4 py-20">
    <div className="bg-white rounded-[40px] p-12 shadow-xl border border-gray-100 space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Privacy Policy</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Last updated: April 2026</p>
      </div>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">1. Information We Collect</h2>
        <p className="text-gray-600 leading-relaxed">
          At BloggerPro, we collect information that you provide directly to us when you create an account, publish stories, or contact us. This may include your name, email address, and any other information you choose to provide.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">2. How We Use Your Information</h2>
        <p className="text-gray-600 leading-relaxed">
          We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your experience on our platform.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">3. Cookies and Third-Party Ads</h2>
        <p className="text-gray-600 leading-relaxed">
          We use cookies to enhance your browsing experience. Cookies are small data files stored on your hard drive or in device memory.
        </p>
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
          <p className="text-orange-800 font-medium italic">
            "We use Google AdSense to display ads. Google may use cookies to serve ads based on user interests."
          </p>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet. Users may opt out of personalized advertising by visiting Ads Settings.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">4. Data Security</h2>
        <p className="text-gray-600 leading-relaxed">
          We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
        </p>
      </section>
    </div>
  </div>
);

const About = () => (
  <div className="max-w-4xl mx-auto px-4 py-20">
    <div className="bg-white rounded-[40px] p-12 shadow-xl border border-gray-100 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">About BloggerPro</h1>
        <div className="w-20 h-1 bg-orange-500 mx-auto rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Our Platform</h2>
          <p className="text-gray-600 leading-relaxed">
            BloggerPro – Insights & Knowledge is a professional platform dedicated to providing high-quality blogging tips, online earning strategies, and comprehensive knowledge sharing.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We believe that everyone has a story to tell and valuable knowledge to share. Our platform provides the tools and community to help you reach a global audience.
          </p>
        </div>
        <div className="bg-orange-50 p-8 rounded-[32px] border border-orange-100">
          <h3 className="text-xl font-bold text-orange-900 mb-4">Our Mission</h3>
          <p className="text-orange-800 font-medium leading-relaxed">
            "Our mission is to help beginners learn blogging and start earning online by providing a safe, professional, and rewarding environment."
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Why Choose Us?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: 'Expert Insights', desc: 'Curated content from experienced bloggers.' },
            { title: 'Earning Potential', desc: 'Monetize your knowledge through our system.' },
            { title: 'Safe Community', desc: 'A professional space for growth and learning.' }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-2">
              <h4 className="font-bold text-gray-900">{item.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success('Message sent! We will get back to you soon.');
      setLoading(false);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="bg-white rounded-[40px] p-12 shadow-xl border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Contact Us</h1>
              <p className="text-gray-500 leading-relaxed">
                Have questions or need assistance? Our team is here to help you on your blogging journey.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Us</p>
                  <p className="text-gray-900 font-bold">aiwithqammar@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Platform Name</p>
                  <p className="text-gray-900 font-bold">Blogger Pro</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-orange-800 text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                "We usually respond within 24–48 hours"
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</label>
              <textarea 
                required
                rows={4}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                placeholder="How can we help you?"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const PostView = () => {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [popularPosts, setPopularPosts] = useState<BlogPost[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const { user, settings } = useAuth();
  const { setIsEligible } = useAdEligibility();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const docRef = doc(db, 'posts', id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
        } else {
          toast.error('Post not found');
          navigate('/');
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `posts/${id}`));

      // Fetch popular posts for sidebar
      const popularQ = query(
        collection(db, 'posts'),
        where('status', '==', 'approved'),
        orderBy('views', 'desc'),
        limit(5)
      );
      const unsubPopular = onSnapshot(popularQ, (snap) => {
        setPopularPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      });

      // Fetch comments for count
      const commentsQ = query(
        collection(db, 'posts', id, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const unsubComments = onSnapshot(commentsQ, (snap) => {
        setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      });

      return () => {
        unsubscribe();
        unsubPopular();
        unsubComments();
      };
    }
  }, [id, navigate]);

  useEffect(() => {
    if (post) {
      // Fetch related posts (same category, excluding current post)
      const relatedQ = query(
        collection(db, 'posts'),
        where('status', '==', 'approved'),
        where('category', '==', post.category),
        limit(4)
      );
      const unsubRelated = onSnapshot(relatedQ, (snap) => {
        setRelatedPosts(snap.docs.filter(d => d.id !== post.id).map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)).slice(0, 3));
      });

      const wordCount = post.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      setIsEligible(wordCount >= 800);

      return () => unsubRelated();
    } else {
      setIsEligible(false);
    }
  }, [post, setIsEligible]);

  // Separate effect for incrementing views to avoid infinite loops
  useEffect(() => {
    const incrementViews = async () => {
      if (!id) return;
      const docRef = doc(db, 'posts', id);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as BlogPost;
          
          // Only count views for approved posts
          if (data.status !== 'approved') return;
          
          // Increment views
          await updateDoc(docRef, { views: increment(1) });
          
          // Award coins to the author for every view
          const authorRef = doc(db, 'users', data.authorId);
          await updateDoc(authorRef, { 
            coins: increment(settings.coinValuePerView),
            totalEarned: increment(settings.coinValuePerView)
          });
        }
      } catch (error) {
        console.error('Failed to increment views:', error);
      }
    };

    incrementViews();
  }, [id, settings.coinValuePerView]);

  const handleLike = async () => {
    if (!user || !id) {
      toast.error('Please sign in to like this story');
      return;
    }
    const docRef = doc(db, 'posts', id);
    const isLiked = post.likedBy?.includes(user.uid);
    try {
      await updateDoc(docRef, {
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      toast.success(isLiked ? 'Unliked' : 'Liked!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
    }
  };

  if (!post) return null;

  const wordCount = post.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const showAds = wordCount >= 800;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full badge-shine">
                  {post.category}
                </span>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                {post.title}
              </h1>
              {showAds && <AdBanner position="inline" />}
              <div className="flex items-center gap-6 py-6 border-y border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500">
                    {post.authorName[0]}
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-gray-900">{post.authorName}</p>
                      <AuthorBadge badge={post.authorBadge} role={post.authorRole} className="mt-0.5" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Author</p>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-gray-100" />
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Eye className="w-4 h-4" /> {post.views} Views
                  </div>
                  <button 
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all",
                      post.likedBy?.includes(user?.uid || '') ? "text-orange-600" : "hover:text-orange-500"
                    )}
                  >
                    <ThumbsUp className={cn("w-4 h-4", post.likedBy?.includes(user?.uid || '') && "fill-current")} /> 
                    {post.likes || 0} Likes
                  </button>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <MessageSquare className="w-4 h-4" /> {comments.length} Comments
                  </div>
                </div>
              </div>
            </div>

            {post.thumbnail && (
              <div className="aspect-video rounded-[40px] overflow-hidden bg-gray-100 shadow-2xl">
                <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}

            <div className="prose prose-orange prose-xl max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                {(() => {
                  const paragraphs = post.content.split('\n\n');
                  return paragraphs.map((para, i) => (
                    <React.Fragment key={i}>
                      <p>{para}</p>
                      {/* Ad after 2-3 paragraphs (using 2nd) */}
                      {showAds && i === 1 && <AdBanner position="inline" />}
                      {/* Ad in the middle */}
                      {showAds && i === Math.floor(paragraphs.length / 2) && i > 1 && i < paragraphs.length - 1 && <AdBanner position="inline" />}
                    </React.Fragment>
                  ));
                })()}
                {showAds && <AdBanner position="inline" />} {/* End of article ad */}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-6 py-12 border-y border-gray-100">
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Did you enjoy this story?</p>
              <button 
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-3 px-10 py-5 rounded-[30px] font-black text-lg transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 badge-shine",
                  post.likedBy?.includes(user?.uid || '') 
                    ? "bg-orange-600 text-white shadow-orange-200" 
                    : "bg-white text-gray-900 border-2 border-gray-100 hover:border-orange-500 hover:text-orange-600"
                )}
              >
                <ThumbsUp className={cn("w-6 h-6", post.likedBy?.includes(user?.uid || '') && "fill-current")} />
                {post.likedBy?.includes(user?.uid || '') ? 'Liked!' : 'Like this Story'}
                <span className="ml-2 px-3 py-1 bg-black/10 rounded-full text-sm">
                  {post.likes || 0}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4 py-10">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Share this story:</span>
              <div className="flex gap-3">
                {['Facebook', 'Twitter', 'LinkedIn', 'WhatsApp'].map(platform => (
                  <button key={platform} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-orange-500 hover:text-white transition-all border border-gray-100">
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {relatedPosts.length > 0 && (
              <section className="pt-10 border-t border-gray-100 space-y-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Related Stories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {relatedPosts.map(rp => (
                    <Link key={rp.id} to={`/post/${rp.id}`} className="group space-y-4">
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                        <img src={rp.thumbnail || `https://picsum.photos/seed/${rp.id}/400/300`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-tight">
                        {rp.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <AdBanner position="footer" />

            <Comments postId={post.id} />
          </motion.div>
        </div>

        <div className="lg:col-span-4">
          <Sidebar popularPosts={popularPosts} />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, settings } = useAuth();
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ 
    method: 'JazzCash', 
    amount: '',
    accountName: '',
    accountNumber: '',
    iban: ''
  });

  useEffect(() => {
    if (user) {
      const postsQ = query(collection(db, 'posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
      const postsUnsub = onSnapshot(postsQ, (snapshot) => {
        setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      });

      const withdrawalsQ = query(collection(db, 'withdrawals'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const withdrawalsUnsub = onSnapshot(withdrawalsQ, (snapshot) => {
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
      });

      const depositsQ = query(collection(db, 'deposits'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const depositsUnsub = onSnapshot(depositsQ, (snapshot) => {
        setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
      });

      return () => {
        postsUnsub();
        withdrawalsUnsub();
        depositsUnsub();
      };
    }
  }, [user]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const amount = parseFloat(withdrawForm.amount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < settings.minWithdrawal) {
      toast.error(`Minimum withdrawal is ${settings.minWithdrawal} coins`);
      return;
    }

    if (amount > user.coins) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const details = withdrawForm.method === 'Bank' 
        ? `Name: ${withdrawForm.accountName}, IBAN: ${withdrawForm.iban}`
        : `Name: ${withdrawForm.accountName}, Number: ${withdrawForm.accountNumber}`;

      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        amount,
        method: withdrawForm.method,
        accountName: withdrawForm.accountName,
        accountNumber: withdrawForm.accountNumber || '',
        iban: withdrawForm.iban || '',
        details,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coins: increment(-amount)
      });

      // Notify BPA
      notifyAdminNewWithdrawal({
        userName: user.displayName,
        userEmail: user.email,
        amount,
        method: withdrawForm.method,
        accountName: withdrawForm.accountName,
        accountNumber: withdrawForm.accountNumber,
        iban: withdrawForm.iban,
        details
      });

      toast.success('Withdrawal request submitted!');
      setWithdrawForm({ 
        method: 'JazzCash', 
        amount: '',
        accountName: '',
        accountNumber: '',
        iban: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <AdBanner position="top" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 flex flex-col md:flex-row items-center gap-6 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
          <div className="w-24 h-24 rounded-full bg-gray-100 relative border-4 border-white shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-gray-300 m-6" />}
            </div>
            {(user.role === 'admin' || (user.membership?.plan && user.membership?.status === 'approved')) && (
              <div className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg badge-shine z-10">
                {user.role === 'admin' ? 'BPA' : (user.membership?.plan === 'Pro' ? 'P' : user.membership?.plan === 'Super Pro' ? 'SP' : 'LP')}
              </div>
            )}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.displayName}</h1>
            <p className="text-gray-500 font-medium">{user.email}</p>
          </div>
        </div>

        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-orange-600 mb-4">
              <div className="p-2 bg-orange-50 rounded-xl"><Wallet className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Current Balance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.coins.toFixed(0)} Coins</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-green-600 mb-4">
              <div className="p-2 bg-green-50 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Total Earned</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.totalEarned.toFixed(0)} Coins</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-purple-600 mb-4">
              <div className="p-2 bg-purple-50 rounded-xl"><Shield className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Membership Status</span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">{user.membership?.plan || 'No Active Plan'}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-widest mt-1",
                    user.membership?.status === 'approved' ? "text-green-500" : 
                    user.membership?.status === 'pending' ? "text-orange-500" : "text-gray-400"
                  )}>
                    {user.membership?.status === 'approved' ? 'Active Membership' : 
                     user.membership?.status === 'pending' ? 'Verification Pending' : 'No Membership Found'}
                  </p>
                  {user.membership?.status === 'approved' && user.membership.expiresAt && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      Expires on: <span className="font-bold text-red-500">
                        {user.membership.expiresAt.toDate ? format(user.membership.expiresAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </p>
                  )}
                </div>
                {user.role === 'admin' ? (
                  <span className="bg-purple-600 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter badge-shine">
                    Blogger Pro Admin
                  </span>
                ) : user.membership?.badge && (
                  <span className="bg-orange-600 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter badge-shine">
                    {user.membership.badge}
                  </span>
                )}
              </div>
              {user.membership?.status !== 'approved' && (
                <Link 
                  to="/membership" 
                  className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-700 transition-all text-center shadow-lg shadow-orange-100"
                >
                  {user.membership?.status === 'pending' ? 'View Other Plans' : 'Buy Membership Plan'}
                </Link>
              )}
            </div>
          </div>
          <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-lg shadow-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><PenSquare className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Stories Published</span>
            </div>
            <p className="text-3xl font-bold">{userPosts.length}</p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">My Stories</h2>
            <div className="space-y-4">
              {userPosts.map(post => (
                <div key={post.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={post.thumbnail || `https://picsum.photos/seed/${post.id}/200/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{post.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>
                      <AuthorBadge badge={post.authorBadge} role={post.authorRole} />
                      <span className={cn(
                        "px-2 py-0.5 rounded",
                        post.status === 'approved' ? "bg-green-50 text-green-600" : 
                        post.status === 'pending' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                      )}>{post.status}</span>
                    </div>
                  </div>
                  <Link to={`/post/${post.id}`} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 text-gray-400" /></Link>
                </div>
              ))}
              {userPosts.length === 0 && <p className="text-gray-400 text-center py-8">No stories yet.</p>}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Withdrawal History</h2>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Method</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Account Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.map(req => (
                    <tr key={req.id}>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{req.amount} Coins</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.method}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="font-bold text-gray-700">{req.accountName}</div>
                        <div>{req.method === 'Bank' ? req.iban : req.accountNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
                          req.status === 'approved' ? "bg-green-50 text-green-600" : 
                          req.status === 'pending' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                        )}>{req.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {withdrawals.length === 0 && <p className="text-center py-8 text-gray-400">No withdrawals yet.</p>}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Withdrawal</h3>
            <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Support Contact</p>
              <p className="text-sm font-bold text-gray-900">WhatsApp: +923121130219</p>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Withdraw Amount (Coins)</label>
                <input 
                  type="number"
                  placeholder={`Min: ${settings.minWithdrawal}`}
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</label>
                <select 
                  value={withdrawForm.method}
                  onChange={e => setWithdrawForm({ ...withdrawForm, method: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                >
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Account Holder Name</label>
                <input 
                  type="text"
                  placeholder="Full name on account"
                  value={withdrawForm.accountName}
                  onChange={e => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              {withdrawForm.method === 'Bank' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">IBAN Number</label>
                  <input 
                    type="text"
                    placeholder="PK00XXXX..."
                    value={withdrawForm.iban}
                    onChange={e => setWithdrawForm({ ...withdrawForm, iban: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Account Number</label>
                  <input 
                    type="text"
                    placeholder="03XXXXXXXXX"
                    value={withdrawForm.accountNumber}
                    onChange={e => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={isWithdrawing || user.coins < settings.minWithdrawal}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                {isWithdrawing ? 'Processing...' : `Withdraw Coins`}
              </button>
              {user.coins < settings.minWithdrawal && (
                <p className="text-[10px] text-red-500 text-center">Minimum withdrawal: {settings.minWithdrawal} coins</p>
              )}
            </form>
            {/* Deposit History */}
            <div className="bg-white rounded-[40px] p-10 shadow-sm border border-gray-100 mt-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <Database className="w-6 h-6 text-orange-500" />
                  Deposit History
                </h3>
              </div>
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-orange-500">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{deposit.planName} Plan</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          TRX: {deposit.trxId} • {format(deposit.createdAt?.toDate() || new Date(), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">Rs {deposit.amount}</p>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest mt-1",
                        deposit.status === 'approved' ? "text-green-500" : 
                        deposit.status === 'pending' ? "text-orange-500" : "text-red-500"
                      )}>
                        {deposit.status}
                      </p>
                    </div>
                  </div>
                ))}
                {deposits.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No deposits found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Editor = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', content: '', category: 'Tech', thumbnail: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Word count validation (800+ words)
    const wordCount = form.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 800) {
      toast.error(`Your story is too short (${wordCount} words). Please write at least 800 words for high-quality content.`);
      return;
    }

    setLoading(true);
    const isAdmin = user.role === 'admin';
    try {
      await addDoc(collection(db, 'posts'), {
        ...form,
        authorId: user.uid,
        authorName: user.displayName,
        authorBadge: user.membership?.badge || null,
        authorRole: user.role,
        views: 0,
        likes: 0,
        likedBy: [],
        status: isAdmin ? 'approved' : 'pending',
        createdAt: serverTimestamp()
      });
      toast.success(isAdmin ? 'Story published successfully!' : 'Story submitted for approval!');
      navigate(isAdmin ? '/' : '/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin' && user?.membership?.status !== 'approved') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-[40px] p-12 shadow-xl border border-gray-100">
          <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-500 mx-auto mb-8">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Premium Access Required</h1>
          <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
            You need an active membership plan to publish stories on BloggerPro. 
            {user?.membership?.status === 'pending' 
              ? "Your deposit is currently under review. Please wait for BPA approval."
              : "Upgrade your account today to start earning from your insights."}
          </p>
          {user?.membership?.status !== 'pending' && (
            <Link 
              to="/membership" 
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200"
            >
              View Membership Plans <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <AdBanner position="top" />
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Create New Story</h1>
          <button 
            type="submit"
            disabled={loading}
            className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
          >
            {loading ? 'Publishing...' : (user?.role === 'admin' ? 'Publish Now' : 'Submit Story')}
          </button>
        </div>

        <div className="space-y-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
              <select 
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
              >
                {['Tech', 'Earning', 'News', 'Lifestyle', 'Finance', 'Health'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Thumbnail URL (Optional)</label>
              <input 
                type="url" 
                placeholder="https://example.com/image.jpg"
                value={form.thumbnail}
                onChange={e => setForm({ ...form, thumbnail: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
            <input 
              type="text" 
              placeholder="Enter a catchy title..."
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-2xl font-bold focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content</label>
            <textarea 
              placeholder="Tell your story..."
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-lg min-h-[400px] focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>
      </form>
    </div>
  );
};

const BPAPanel = () => {
  const { user, settings } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'posts' | 'withdrawals' | 'deposits' | 'users' | 'settings'>('dashboard');
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Deposit[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([]);
  const [platformStats, setPlatformStats] = useState({ totalUsers: 0, totalEarnings: 0, totalWithdrawals: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    const postsUnsub = onSnapshot(query(collection(db, 'posts'), where('status', '==', 'pending')), (snapshot) => {
      setPendingPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
    });

    const allPostsUnsub = onSnapshot(collection(db, 'posts'), (snapshot) => {
      setAllPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
    });

    const withdrawalsUnsub = onSnapshot(query(collection(db, 'withdrawals'), where('status', '==', 'pending')), (snapshot) => {
      setPendingWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
    });

    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(users);
      setPlatformStats(prev => ({
        ...prev,
        totalUsers: users.length,
        totalEarnings: users.reduce((acc, u) => acc + u.totalEarned, 0)
      }));
    });

    const allWithdrawalsUnsub = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      setAllWithdrawals(withdrawals);
      setPlatformStats(prev => ({
        ...prev,
        totalWithdrawals: withdrawals.filter(w => w.status === 'approved').reduce((acc, w) => acc + w.amount, 0)
      }));
    });

    const depositsUnsub = onSnapshot(query(collection(db, 'deposits'), where('status', '==', 'pending')), (snapshot) => {
      setPendingDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
    });

    const allDepositsUnsub = onSnapshot(collection(db, 'deposits'), (snapshot) => {
      setAllDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit)));
    });

    return () => {
      postsUnsub();
      allPostsUnsub();
      withdrawalsUnsub();
      usersUnsub();
      allWithdrawalsUnsub();
      depositsUnsub();
      allDepositsUnsub();
    };
  }, [user, navigate]);

  // Process data for charts
  const getChartData = () => {
    // User Growth (Cumulative)
    const sortedUsers = [...allUsers]
      .filter(u => u.createdAt)
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    
    const userGrowthData = sortedUsers.reduce((acc: any[], u, index) => {
      const date = u.createdAt?.toDate ? format(u.createdAt.toDate(), 'MMM d') : 'Unknown';
      const last = acc[acc.length - 1];
      if (last && last.date === date) {
        last.users = index + 1;
      } else {
        acc.push({ date, users: index + 1 });
      }
      return acc;
    }, []);

    // Earnings/Payouts over time
    const sortedWithdrawals = [...allWithdrawals]
      .filter(w => w.status === 'approved' && w.createdAt)
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

    let cumulativePayout = 0;
    const payoutData = sortedWithdrawals.reduce((acc: any[], w) => {
      const date = w.createdAt?.toDate ? format(w.createdAt.toDate(), 'MMM d') : 'Unknown';
      cumulativePayout += w.amount;
      const last = acc[acc.length - 1];
      if (last && last.date === date) {
        last.amount = cumulativePayout;
      } else {
        acc.push({ date, amount: cumulativePayout });
      }
      return acc;
    }, []);

    return { userGrowthData, payoutData };
  };

  const { userGrowthData, payoutData } = getChartData();

  const handlePostAction = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const postRef = doc(db, 'posts', id);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      const postData = postSnap.data();

      await updateDoc(postRef, { 
        status,
        rejectionReason: status === 'rejected' ? (reason || postRejectionReason) : null
      });
      
      // Get author email to notify
      const userRef = doc(db, 'users', postData.authorId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Notify User via Email
        notifyUserPostStatus({
          userEmail: userData.email,
          userName: userData.displayName,
          postTitle: postData.title,
          status: status,
          rejectionReason: status === 'rejected' ? (reason || postRejectionReason) : undefined
        });

        // Add In-App Notification
        await addDoc(collection(db, 'notifications'), {
          userId: postData.authorId,
          title: `Story ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: status === 'approved' ? `Your story "${postData.title}" has been published!` : `Your story "${postData.title}" was rejected. Reason: ${reason || postRejectionReason}`,
          type: status === 'approved' ? 'post_approved' : 'post_rejected',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success(`Post ${status}!`);
      setPostToReject(null);
    } catch (error) {
      toast.error('Failed to update post status');
      console.error(error);
    }
  };

  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [postToReject, setPostToReject] = useState<string | null>(null);
  const [withdrawalToReject, setWithdrawalToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Minimum withdrawal criteria not met');
  const [postRejectionReason, setPostRejectionReason] = useState('Content does not meet our guidelines');

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      toast.success('Post deleted successfully');
      setPostToDelete(null);
    } catch (error) {
      toast.error('Failed to delete post');
      console.error(error);
    }
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const withdrawalRef = doc(db, 'withdrawals', id);
      const withdrawalSnap = await getDoc(withdrawalRef);
      
      if (withdrawalSnap.exists()) {
        const withdrawalData = withdrawalSnap.data();
        await updateDoc(withdrawalRef, { 
          status,
          rejectionReason: status === 'cancelled' ? rejectionReason : null
        });
        
        // Get user email to notify
        const userRef = doc(db, 'users', withdrawalData.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const finalStatus = status === 'approved' ? 'approved' : 'rejected';
          
          if (status === 'cancelled') {
            await updateDoc(userRef, {
              coins: increment(withdrawalData.amount)
            });
          }

          // Notify User
          notifyUserWithdrawalStatus({
            userEmail: userData.email,
            userName: userData.displayName,
            amount: withdrawalData.amount,
            status: finalStatus,
            rejectionReason: status === 'cancelled' ? rejectionReason : undefined
          });

          // Notify BPA
          notifyAdminWithdrawalProcessed({
            userEmail: userData.email,
            userName: userData.displayName,
            amount: withdrawalData.amount,
            status: finalStatus,
            rejectionReason: status === 'cancelled' ? rejectionReason : undefined
          });

          // Add Notification
          await addDoc(collection(db, 'notifications'), {
            userId: withdrawalData.userId,
            title: `Withdrawal ${status === 'approved' ? 'Approved' : 'Cancelled'}`,
            message: status === 'approved' ? `Your withdrawal of ${withdrawalData.amount} coins has been approved!` : `Your withdrawal of ${withdrawalData.amount} coins was cancelled. Reason: ${rejectionReason}`,
            type: status === 'approved' ? 'withdrawal_approved' : 'withdrawal_cancelled',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
      toast.success(`Withdrawal ${status}!`);
      setWithdrawalToReject(null);
    } catch (error) {
      toast.error('Failed to update withdrawal status');
      console.error(error);
    }
  };

  const handleDepositAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const depositRef = doc(db, 'deposits', id);
      const depositSnap = await getDoc(depositRef);
      if (!depositSnap.exists()) return;
      const depositData = depositSnap.data() as Deposit;

      await updateDoc(depositRef, { status });

      if (status === 'approved') {
        const userRef = doc(db, 'users', depositData.userId);
        const expiresAt = Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
        
        await updateDoc(userRef, {
          'membership.status': 'approved',
          'membership.plan': depositData.planName,
          'membership.badge': depositData.planName,
          'membership.expiresAt': expiresAt
        });

        // Add Notification
        await addDoc(collection(db, 'notifications'), {
          userId: depositData.userId,
          title: 'Your Deposit successfull',
          message: `Your ${depositData.planName} membership has been approved. You can now publish stories!`,
          type: 'post_approved', // Reusing type or add new one
          read: false,
          createdAt: serverTimestamp()
        });
      } else {
        const userRef = doc(db, 'users', depositData.userId);
        await updateDoc(userRef, {
          'membership.status': 'none',
          'membership.plan': null
        });

        // Add Notification
        await addDoc(collection(db, 'notifications'), {
          userId: depositData.userId,
          title: 'Deposit Rejected',
          message: `Your deposit for ${depositData.planName} membership was rejected. Please check your TRX ID and try again.`,
          type: 'post_rejected',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success(`Deposit ${status}!`);
    } catch (error) {
      toast.error('Failed to update deposit status');
      console.error(error);
    }
  };

  const [editingUserCoins, setEditingUserCoins] = useState<string | null>(null);
  const [editingUserBadge, setEditingUserBadge] = useState<string | null>(null);
  const [coinAdjustment, setCoinAdjustment] = useState<string>('0');
  const [newBadge, setNewBadge] = useState<string>('');
  const [isCustomBadge, setIsCustomBadge] = useState(false);

  const handleUpdateUserBadge = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const updateData: any = {
        'membership.badge': newBadge || null
      };
      
      // If setting a standard plan badge, also update status and plan
      if (newBadge === 'Pro' || newBadge === 'Super Pro' || newBadge === 'Legend Pro') {
        updateData['membership.status'] = 'approved';
        updateData['membership.plan'] = newBadge;
      } else if (!newBadge) {
        updateData['membership.status'] = 'none';
        updateData['membership.plan'] = null;
      }

      await updateDoc(userRef, updateData);
      toast.success('User badge updated!');
      setEditingUserBadge(null);
      setIsCustomBadge(false);
    } catch (error) {
      toast.error('Failed to update badge');
      console.error(error);
    }
  };

  const handleUpdateUserCoins = async (uid: string) => {
    const newValue = parseFloat(coinAdjustment);
    if (isNaN(newValue)) {
      toast.error('Please enter a valid number');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentCoins = userDoc.data().coins || 0;
        const currentTotalEarned = userDoc.data().totalEarned || 0;
        
        const newCoins = Math.max(0, newValue);
        const diff = newCoins - currentCoins;
        
        // Only increase totalEarned if we are adding coins
        const newTotalEarned = diff > 0 ? currentTotalEarned + diff : currentTotalEarned;
        
        await updateDoc(userRef, { 
          coins: newCoins,
          totalEarned: newTotalEarned
        });
        
        toast.success(`User balance updated to ${newCoins}!`);
        setEditingUserCoins(null);
        setCoinAdjustment('0');
      }
    } catch (error) {
      toast.error('Failed to update user balance');
      console.error(error);
    }
  };

  const updateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const coinValuePerView = Number(formData.get('coinValuePerView'));
    const minWithdrawal = Number(formData.get('minWithdrawal'));
    
    await setDoc(doc(db, 'settings', 'global'), { coinValuePerView, minWithdrawal });
    toast.success('Settings updated!');
  };

  const seedData = async () => {
    const categories = ['Tech', 'Earning', 'News', 'Lifestyle', 'Finance', 'Health'];
    const storiesPerCategory = 5;
    const totalStories = categories.length * storiesPerCategory;
    
    toast.loading(`Seeding ${totalStories} stories...`, { id: 'seed' });

    try {
      for (const category of categories) {
        for (let i = 1; i <= storiesPerCategory; i++) {
          const postData = {
            title: `${category} Story #${i}: The Future of ${category} in 2026`,
            content: `This is a comprehensive guide about ${category}. In this article, we explore the latest trends and developments in the field of ${category}. Whether you are a beginner or an expert, this story provides valuable insights into how ${category} is shaping our world today. We will cover key topics, expert opinions, and practical tips to help you stay ahead in the ${category} landscape. Stay tuned for more updates and deep dives into the most exciting aspects of ${category}.`,
            category: category,
            thumbnail: `https://picsum.photos/seed/${category}${i}/1200/800`,
            authorId: user?.uid || 'admin',
            authorName: user?.displayName || 'BPA',
            authorBadge: user?.membership?.badge || null,
            authorRole: user?.role || 'admin',
            status: 'approved',
            views: 0,
            likes: 0,
            likedBy: [],
            createdAt: serverTimestamp(),
          };
          await addDoc(collection(db, 'posts'), postData);
        }
      }
      toast.success('Successfully seeded 30 stories!', { id: 'seed' });
    } catch (error) {
      toast.error('Failed to seed data', { id: 'seed' });
      console.error(error);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" /> BPA Control Panel
          </h1>
          <p className="text-sm text-gray-500">Manage posts, withdrawals, and platform settings.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={seedData}
            className="flex items-center gap-2 px-6 py-3 bg-orange-100 text-orange-600 rounded-2xl font-bold text-sm hover:bg-orange-200 transition-all border border-orange-200"
          >
            <Database className="w-4 h-4" /> Seed Sample Data
          </button>
          <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto">
            {['dashboard', 'posts', 'withdrawals', 'deposits', 'users', 'settings'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap relative",
                  activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                )}
              >
                {tab}
                {tab === 'deposits' && pendingDeposits.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[8px] rounded-full flex items-center justify-center border border-white">
                    {pendingDeposits.length}
                  </span>
                )}
                {tab === 'withdrawals' && pendingWithdrawals.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[8px] rounded-full flex items-center justify-center border border-white">
                    {pendingWithdrawals.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-purple-600 p-8 rounded-[32px] text-white shadow-xl shadow-purple-100">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Total Users</p>
          <p className="text-4xl font-bold">{platformStats.totalUsers}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Total Coins Earned</p>
          <p className="text-4xl font-bold text-gray-900">{platformStats.totalEarnings.toFixed(0)}</p>
        </div>
        <div className="bg-green-600 p-8 rounded-[32px] text-white shadow-xl shadow-green-100">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Total Payouts</p>
          <p className="text-4xl font-bold">{platformStats.totalWithdrawals.toFixed(0)} Coins</p>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {activeTab === 'dashboard' && (
          <div className="p-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">User Growth</h3>
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold">
                    <TrendingUp className="w-3 h-3" /> Growth
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userGrowthData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#9333ea" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorUsers)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Payout History</h3>
                  <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-bold">
                    <TrendingUp className="w-3 h-3" /> Payouts
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payoutData}>
                      <defs>
                        <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#9ca3af'}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#ea580c" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorPayout)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-purple-600">
                  <Users className="w-5 h-5" />
                  <h4 className="font-bold">Recent Users</h4>
                </div>
                <div className="space-y-3">
                  {allUsers.slice(-5).reverse().map(u => (
                    <div key={u.uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-purple-600 border border-purple-100">
                          {u.displayName[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{u.displayName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{u.createdAt?.toDate ? format(u.createdAt.toDate(), 'MMM d') : 'New'}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-orange-600">
                  <Wallet className="w-5 h-5" />
                  <h4 className="font-bold">Recent Payouts</h4>
                </div>
                <div className="space-y-3">
                  {allWithdrawals.filter(w => w.status === 'approved').slice(-5).reverse().map(w => (
                    <div key={w.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{w.userName}</span>
                      <span className="text-sm font-bold text-orange-600">{w.amount} Coins</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3 text-green-600">
                  <TrendingUp className="w-5 h-5" />
                  <h4 className="font-bold">Top Earners</h4>
                </div>
                <div className="space-y-3">
                  {[...allUsers].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 5).map(u => (
                    <div key={u.uid} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{u.displayName}</span>
                      <span className="text-sm font-bold text-green-600">{u.totalEarned.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Manage Content</h2>
              <div className="flex gap-4">
                <div className="bg-orange-50 px-4 py-2 rounded-xl">
                  <span className="text-xs font-bold text-orange-600 uppercase">Pending: {pendingPosts.length}</span>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-xl">
                  <span className="text-xs font-bold text-blue-600 uppercase">Total: {allPosts.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {pendingPosts.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Pending Approvals</h3>
                  <div className="space-y-4">
                    {pendingPosts.map(post => (
                      <div key={post.id} className="flex items-center justify-between p-4 bg-white border border-orange-100 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          {post.thumbnail && (
                            <img src={post.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <h4 className="font-bold text-gray-900">{post.title}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">By {post.authorName} • {post.category}</p>
                              <AuthorBadge badge={post.authorBadge} role={post.authorRole} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {postToReject === post.id ? (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                              <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
                                <h3 className="text-xl font-bold text-gray-900">Reject Story</h3>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reason for Rejection</label>
                                  <textarea 
                                    value={postRejectionReason}
                                    onChange={(e) => setPostRejectionReason(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-4">
                                  <button 
                                    onClick={() => handlePostAction(post.id, 'rejected', postRejectionReason)}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                                  >
                                    Confirm Rejection
                                  </button>
                                  <button 
                                    onClick={() => setPostToReject(null)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => handlePostAction(post.id, 'approved')}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => setPostToReject(post.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">All Published Stories</h3>
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Story</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Author</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Views</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allPosts.sort((a, b) => b.views - a.views).map(post => (
                        <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{post.title}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-600">{post.authorName}</span>
                              <AuthorBadge badge={post.authorBadge} role={post.authorRole} className="mt-0.5" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-lg text-gray-600">{post.category}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-bold">{post.views}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                              post.status === 'approved' ? 'bg-green-100 text-green-600' : 
                              post.status === 'pending' ? 'bg-orange-100 text-orange-600' : 
                              'bg-red-100 text-red-600'
                            }`}>
                              {post.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {postToDelete === post.id ? (
                                <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg">
                                  <button 
                                    onClick={() => handleDeletePost(post.id)}
                                    className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700"
                                  >
                                    Confirm
                                  </button>
                                  <button 
                                    onClick={() => setPostToDelete(null)}
                                    className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold rounded hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setPostToDelete(post.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete Post"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="p-8 space-y-12">
            <div>
              <h2 className="text-xl font-bold mb-6">Pending Withdrawals ({pendingWithdrawals.length})</h2>
              <div className="space-y-4">
                {pendingWithdrawals.map(req => (
                  <div key={req.id} className="p-6 bg-gray-50 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900">{req.userName}</h4>
                        <p className="text-sm text-orange-600 font-bold">{req.amount} Coins</p>
                      </div>
                      <div className="flex gap-2">
                        {withdrawalToReject === req.id ? (
                          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
                              <h3 className="text-xl font-bold text-gray-900">Reject Withdrawal</h3>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reason for Rejection</label>
                                <textarea 
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => handleWithdrawalAction(req.id, 'cancelled')}
                                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                                >
                                  Confirm Rejection
                                </button>
                                <button 
                                  onClick={() => setWithdrawalToReject(null)}
                                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleWithdrawalAction(req.id, 'approved')} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700">Approve</button>
                            <button onClick={() => setWithdrawalToReject(req.id)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400 uppercase tracking-widest font-bold mb-1">Method</p>
                        <p className="text-gray-900 font-medium">{req.method}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase tracking-widest font-bold mb-1">Account Holder</p>
                        <p className="text-gray-900 font-medium">{req.accountName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 uppercase tracking-widest font-bold mb-1">{req.method === 'Bank' ? 'IBAN' : 'Number'}</p>
                        <p className="text-gray-900 font-medium">{req.method === 'Bank' ? req.iban : req.accountNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingWithdrawals.length === 0 && <p className="text-center text-gray-400">No pending withdrawals.</p>}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-6">Withdrawal History</h2>
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Method</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Account Info</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allWithdrawals.filter(w => w.status !== 'pending').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(req => (
                      <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{req.userName}</div>
                          <div className="text-[10px] text-gray-400">{req.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-orange-600">{req.amount} Coins</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-lg text-gray-600">{req.method}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-700 font-bold">{req.accountName}</div>
                          <div className="text-[10px] text-gray-500">{req.method === 'Bank' ? req.iban : req.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-400">
                            {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MMM d, yyyy') : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allWithdrawals.filter(w => w.status !== 'pending').length === 0 && (
                  <div className="p-8 text-center text-gray-400">No withdrawal history found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deposits' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pending Deposits</h2>
            <div className="grid grid-cols-1 gap-6">
              {pendingDeposits.map((deposit) => (
                <div key={deposit.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-64 h-64 rounded-3xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img 
                      src={deposit.screenshotUrl} 
                      alt="Screenshot" 
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(deposit.screenshotUrl, '_blank')}
                    />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-gray-900">{deposit.userName}</h3>
                        <p className="text-sm font-bold text-orange-500 uppercase tracking-widest mt-1">{deposit.planName} Plan</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">Rs {deposit.amount}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">TRX: {deposit.trxId}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleDepositAction(deposit.id, 'approved')}
                        className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button 
                        onClick={() => handleDepositAction(deposit.id, 'rejected')}
                        className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                      >
                        <Ban className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingDeposits.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold uppercase tracking-widest">No pending deposits</p>
                </div>
              )}
            </div>

            <div className="mt-12 space-y-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Deposit History</h2>
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">TRX ID</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Screenshot</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allDeposits.filter(d => d.status !== 'pending').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(deposit => (
                      <tr key={deposit.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-gray-900">{deposit.userName}</p>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-orange-600 uppercase tracking-widest">{deposit.planName}</span>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-gray-900">Rs {deposit.amount}</p>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{deposit.trxId}</p>
                        </td>
                        <td className="px-8 py-4">
                          {deposit.screenshotUrl ? (
                            <button 
                              onClick={() => window.open(deposit.screenshotUrl, '_blank')}
                              className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">No Image</span>
                          )}
                        </td>
                        <td className="px-8 py-4">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                            deposit.status === 'approved' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          )}>
                            {deposit.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="text-xs text-gray-400">
                            {deposit.createdAt?.toDate ? format(deposit.createdAt.toDate(), 'MMM d, yyyy') : 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allDeposits.filter(d => d.status !== 'pending').length === 0 && (
                  <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest">No deposit history found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Badge</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Current Balance</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Total Earned</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allUsers.map(u => (
                  <tr key={u.uid}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          {u.photoURL && <img src={u.photoURL} alt={u.displayName} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{u.displayName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 capitalize text-sm">{u.role}</td>
                    <td className="px-8 py-4">
                      {editingUserBadge === u.uid ? (
                        <div className="flex flex-col gap-2">
                          {!isCustomBadge ? (
                            <select 
                              value={['Pro', 'Super Pro', 'Legend Pro', ''].includes(newBadge) ? newBadge : 'custom'}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setIsCustomBadge(true);
                                } else {
                                  setNewBadge(e.target.value);
                                }
                              }}
                              className="w-32 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                            >
                              <option value="">Reset Membership</option>
                              <option value="Pro">Pro (Plan 1)</option>
                              <option value="Super Pro">Super Pro (Plan 2)</option>
                              <option value="Legend Pro">Legend Pro (Plan 3)</option>
                              <option value="custom">Custom Badge...</option>
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              value={newBadge}
                              onChange={(e) => setNewBadge(e.target.value)}
                              className="w-32 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                              placeholder="Badge name"
                              autoFocus
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleUpdateUserBadge(u.uid)}
                              className="flex-1 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingUserBadge(null);
                                setIsCustomBadge(false);
                              }}
                              className="flex-1 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {u.membership?.badge ? (
                            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border border-orange-200 badge-shine">
                              {u.membership.badge}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">None</span>
                          )}
                          <button 
                            onClick={() => {
                              setEditingUserBadge(u.uid);
                              setNewBadge(u.membership?.badge || '');
                            }}
                            className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold">
                      {editingUserCoins === u.uid ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={coinAdjustment}
                            onChange={(e) => setCoinAdjustment(e.target.value)}
                            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                            placeholder="New Balance"
                          />
                          <button 
                            onClick={() => handleUpdateUserCoins(u.uid)}
                            className="p-1 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingUserCoins(null);
                              setCoinAdjustment('0');
                            }}
                            className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{u.coins.toFixed(0)}</span>
                          <button 
                            onClick={() => {
                              setEditingUserCoins(u.uid);
                              setCoinAdjustment('0');
                            }}
                            className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm font-bold text-green-600">{u.totalEarned.toFixed(0)}</td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => {
                          setEditingUserCoins(u.uid);
                          setCoinAdjustment(u.coins.toString());
                        }}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700"
                      >
                        Edit Balance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-12 max-w-md mx-auto">
            <form onSubmit={updateSettings} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Coins Per View</label>
                <input 
                  type="number" 
                  step="0.1"
                  name="coinValuePerView"
                  defaultValue={settings.coinValuePerView}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Minimum Withdrawal (Coins)</label>
                <input 
                  type="number" 
                  name="minWithdrawal"
                  defaultValue={settings.minWithdrawal}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg">Save Settings</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const isAdmin = email === 'pishawrichappalhouse@gmail.com';
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          coins: 0,
          totalEarned: 0,
          role: isAdmin ? 'admin' : 'user',
          membership: {
            plan: null,
            status: 'none'
          },
          createdAt: serverTimestamp()
        });
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        // Ensure admin role is synced if it's the admin email
        if (email === 'pishawrichappalhouse@gmail.com') {
          await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
        }
      }

      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() as UserProfile;
      
      if (userData.role === 'admin' || userData.membership?.status === 'approved') {
        navigate('/dashboard');
      } else {
        navigate('/membership');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const { user } = await signInWithPopup(auth, googleProvider);
      const isAdmin = user.email === 'pishawrichappalhouse@gmail.com';
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL,
          coins: 0,
          totalEarned: 0,
          role: isAdmin ? 'admin' : 'user',
          membership: {
            plan: null, // Default to null
            status: 'none'
          },
          createdAt: serverTimestamp()
        });
      } else if (isAdmin) {
        await updateDoc(docRef, { role: 'admin' });
      }
      
      // Check membership status
      const updatedSnap = await getDoc(docRef);
      const userData = updatedSnap.data() as UserProfile;
      if (userData.role === 'admin' || userData.membership?.status === 'approved') {
        navigate('/dashboard');
      } else {
        navigate('/membership');
      }
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked! Please allow popups for this site or open in a new tab.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore user cancellation
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Ignore user closure
      } else if (error.message.includes('cross-origin-isolated')) {
        toast.error('Browser restriction detected. Please try opening the app in a new tab.');
      } else {
        toast.error(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <AdBanner position="top" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl shadow-orange-100/50"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-xl shadow-orange-200">
            B
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          <button 
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
            Continue with Google
          </button>

          {/iPhone|iPad|iPod|Safari/i.test(navigator.userAgent) && !/Chrome|CriOS/i.test(navigator.userAgent) && (
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-[10px] text-orange-800 font-medium text-center leading-relaxed">
                iPhone/Safari users: If you experience login issues, please tap the "Share" icon and select <strong>"Open in Safari"</strong> or open this link in a new tab.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-orange-600 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Provider ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PlatformSettings>({ coinValuePerView: 1, minWithdrawal: 1000 });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            
            // Check for membership expiration
            if (userData.membership?.status === 'approved' && userData.membership.expiresAt) {
              const now = Timestamp.now();
              const expiresAt = userData.membership.expiresAt;
              
              if (now.toMillis() > expiresAt.toMillis()) {
                // Membership expired
                updateDoc(doc(db, 'users', firebaseUser.uid), {
                  'membership.status': 'none',
                  'membership.plan': null,
                  'membership.expiresAt': null
                }).catch(err => console.error('Failed to expire membership:', err));
                
                // Add Notification for expiration
                addDoc(collection(db, 'notifications'), {
                  userId: firebaseUser.uid,
                  title: 'Membership Expired',
                  message: 'Your 3-month membership has expired. Please reactivate to continue enjoying premium features.',
                  type: 'post_rejected',
                  read: false,
                  createdAt: serverTimestamp()
                }).catch(err => console.error('Failed to send expiration notification:', err));
              }
            }
            
            setUser(userData);
          }
          setLoading(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as PlatformSettings);
      } else if (auth.currentUser) {
        // Bootstrap settings if they don't exist and user is authenticated
        setDoc(doc(db, 'settings', 'global'), {
          coinValuePerView: 1,
          minWithdrawal: 1000
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/global'));
      }
    });

    return () => {
      unsubAuth();
      unsubSettings();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, settings }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// --- App ---

const CategoryView = () => {
  const { category } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { setIsEligible } = useAdEligibility();

  useEffect(() => {
    if (!category) return;
    
    // Normalize category name (Capitalize first letter if it's lowercase)
    const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    const q = query(
      collection(db, 'posts'),
      where('category', 'in', [category, normalizedCategory]),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
      setPosts(fetchedPosts);
      setIsEligible(fetchedPosts.length > 0);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `posts/${category}`));

    return () => unsubscribe();
  }, [category, setIsEligible]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {posts.length > 0 && <AdBanner position="top" />}
      <div className="flex items-center gap-4 mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight capitalize">{category} Stories</h1>
        <div className="h-[2px] bg-gray-100 flex-1" />
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{posts.length} Articles</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post, index) => (
          <React.Fragment key={post.id}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-white rounded-[32px] overflow-hidden border border-gray-100 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500"
            >
              <Link to={`/post/${post.id}`} className="block">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img 
                    src={post.thumbnail || `https://picsum.photos/seed/${post.id}/800/500`} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm badge-shine">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{post.authorName}</span>
                      <AuthorBadge badge={post.authorBadge} role={post.authorRole} className="mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <Eye className="w-3 h-3" /> {post.views}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
            {(index + 1) % 6 === 0 && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <AdBanner position="inline" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {posts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">No stories found in this category yet.</p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AdEligibilityProvider>
          <NotificationListener />
          <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-orange-100 selection:text-orange-900">
            <Toaster position="top-center" richColors />
            <Navbar />
            <MembershipNotice />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/membership" element={<Membership />} />
                <Route path="/deposit" element={<Deposit />} />
                <Route path="/category/:category" element={<CategoryView />} />
                <Route path="/post/:id" element={<PostView />} />
                <Route path="/dashboard" element={<PlanGuard><Dashboard /></PlanGuard>} />
                <Route path="/create" element={<PlanGuard><Editor /></PlanGuard>} />
                <Route path="/admin" element={<BPAPanel />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<PrivacyPolicy />} />
              </Routes>
            </main>
            <StickyAd />
            <Footer />
          </div>
        </AdEligibilityProvider>
      </AuthProvider>
    </Router>
  );
}

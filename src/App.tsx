import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
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
  Ban
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
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { notifyAdminNewWithdrawal, notifyUserWithdrawalStatus } from './services/emailService';
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
  createdAt: any;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  thumbnail?: string;
  views: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: 'JazzCash' | 'EasyPaisa' | 'Bank';
  details: string;
  status: 'pending' | 'approved' | 'cancelled';
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
  content: string;
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
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{comment.userName}</span>
                  <span className="text-xs text-gray-400">
                    {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                  </span>
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

const Navbar = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-200">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">BlogEarn</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Explore</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/create" 
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                >
                  <PenSquare className="w-4 h-4" />
                  Write
                </Link>
                <div className="h-8 w-[1px] bg-gray-200 mx-2" />
                <Link to="/dashboard" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border-2 border-transparent group-hover:border-orange-500 transition-all">
                    {user.photoURL ? <img src={user.photoURL} alt={user.displayName} /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-4 h-4" /></div>}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-xs font-bold text-gray-900 leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-orange-600 font-medium">{user.coins.toFixed(0)} Coins</p>
                  </div>
                </Link>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-gray-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link to="/" className="block text-lg font-medium text-gray-900">Explore</Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="block text-lg font-medium text-gray-900">Dashboard</Link>
                  <Link to="/create" className="block text-lg font-medium text-orange-600">Write a Story</Link>
                  <button onClick={handleLogout} className="block text-lg font-medium text-red-600">Logout</button>
                </>
              ) : (
                <Link to="/login" className="block text-lg font-medium text-orange-600">Sign In</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const pushedElements = new WeakSet<HTMLElement>();

const AdBanner = ({ position }: { position: 'top' | 'sidebar' | 'footer' | 'inline' }) => {
  const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-6776734432817673';
  const adRef = React.useRef<HTMLModElement>(null);
  
  useEffect(() => {
    if (adRef.current && !pushedElements.has(adRef.current) && !adRef.current.hasAttribute('data-adsbygoogle-status')) {
      pushedElements.add(adRef.current);
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

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
           data-ad-slot="auto"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

// --- Pages ---

const Home = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Technology', 'Finance', 'Health', 'Travel', 'Food', 'Design', 'Marketing'];

  useEffect(() => {
    let q = query(collection(db, 'posts'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    
    if (selectedCategory !== 'All') {
      q = query(collection(db, 'posts'), 
        where('status', '==', 'approved'), 
        where('category', '==', selectedCategory),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => unsubscribe();
  }, [selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AdBanner position="top" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Latest Stories</h2>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedCategory === cat 
                      ? "bg-orange-600 text-white shadow-lg shadow-orange-100" 
                      : "bg-white text-gray-400 border border-gray-100 hover:border-orange-200 hover:text-orange-600"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-8">
              {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-12">
              {posts.map((post, idx) => (
                <motion.article 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
                >
                  <div className="md:col-span-4">
                    <Link to={`/post/${post.id}`} className="block aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100">
                      <img 
                        src={post.thumbnail || `https://picsum.photos/seed/${post.id}/800/400`} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                  </div>
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center gap-3 text-xs font-bold text-orange-600 uppercase tracking-widest">
                      <span>{post.category}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-gray-400">{post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                    </div>
                    <Link to={`/post/${post.id}`}>
                      <h3 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="text-gray-500 line-clamp-2 text-sm leading-relaxed">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">{post.authorName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter">
                          <Eye className="w-3 h-3" /> {post.views}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
              {posts.length === 0 && <p className="text-center text-gray-500 py-12">No stories found yet.</p>}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-12">
          <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Earning Today</h3>
            <p className="text-sm text-gray-600 mb-6">Write stories, get views, and earn coins. 1000 coins = Cash payout!</p>
            <Link to="/create" className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">
              Start Writing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <AdBanner position="sidebar" />
        </div>
      </div>
      
      <AdBanner position="footer" />
    </div>
  );
};

const PostView = () => {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const { settings } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const docRef = doc(db, 'posts', id);
      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as BlogPost;
          setPost({ id: docSnap.id, ...data });
          
          // Increment views and award coins
          // Only if user is authenticated and not the author
          const currentUserId = auth.currentUser?.uid;
          if (currentUserId && currentUserId !== data.authorId) {
            await updateDoc(docRef, { views: increment(1) });
            const authorRef = doc(db, 'users', data.authorId);
            await updateDoc(authorRef, { 
              coins: increment(settings.coinValuePerView),
              totalEarned: increment(settings.coinValuePerView)
            });
          } else if (!currentUserId) {
            // Public view increment (allowed by rules without auth)
            await updateDoc(docRef, { views: increment(1) });
          }
        } else {
          toast.error('Post not found');
          navigate('/');
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `posts/${id}`));

      return () => unsubscribe();
    }
  }, [id, navigate, settings.coinValuePerView]);

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <AdBanner position="top" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-4 text-center">
          <div className="inline-block px-4 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
            {post.category}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{post.authorName}</p>
                <p className="text-xs text-gray-400">{post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently'}</p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
              <Eye className="w-4 h-4" /> {post.views} Views
            </div>
          </div>
        </div>

        {post.thumbnail && (
          <div className="aspect-video rounded-3xl overflow-hidden bg-gray-100 shadow-2xl">
            <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}

        <div className="prose prose-orange max-w-none">
          <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
        
        <AdBanner position="inline" />

        <Comments postId={post.id} />
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user, settings } = useAuth();
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ method: 'JazzCash', details: '' });

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

      return () => {
        postsUnsub();
        withdrawalsUnsub();
      };
    }
  }, [user]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (user.coins < settings.minWithdrawal) {
      toast.error(`Minimum withdrawal is ${settings.minWithdrawal} coins`);
      return;
    }

    setIsWithdrawing(true);
    try {
      const amount = user.coins;
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userName: user.displayName,
        amount,
        method: withdrawForm.method,
        details: withdrawForm.details,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coins: 0
      });

      // Notify Admin
      notifyAdminNewWithdrawal({
        userName: user.displayName,
        userEmail: user.email,
        amount,
        method: withdrawForm.method,
        details: withdrawForm.details
      });

      toast.success('Withdrawal request submitted!');
      setWithdrawForm({ method: 'JazzCash', details: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.map(req => (
                    <tr key={req.id}>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{req.amount} Coins</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.method}</td>
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
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Account Details</label>
                <textarea 
                  placeholder="Enter account number or bank details..."
                  value={withdrawForm.details}
                  onChange={e => setWithdrawForm({ ...withdrawForm, details: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isWithdrawing || user.coins < settings.minWithdrawal}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                {isWithdrawing ? 'Processing...' : `Withdraw ${user.coins.toFixed(0)} Coins`}
              </button>
              {user.coins < settings.minWithdrawal && (
                <p className="text-[10px] text-red-500 text-center">Minimum withdrawal: {settings.minWithdrawal} coins</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Editor = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', content: '', category: 'Technology', thumbnail: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        ...form,
        authorId: user.uid,
        authorName: user.displayName,
        views: 0,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Story submitted for approval!');
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Create New Story</h1>
          <button 
            type="submit"
            disabled={loading}
            className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Submit Story'}
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
                {['Technology', 'Finance', 'Health', 'Travel', 'Food', 'Design', 'Marketing'].map(cat => (
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

const AdminPanel = () => {
  const { user, settings } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'withdrawals' | 'users' | 'settings'>('posts');
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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
      const withdrawals = snapshot.docs.map(doc => doc.data() as WithdrawalRequest);
      setPlatformStats(prev => ({
        ...prev,
        totalWithdrawals: withdrawals.filter(w => w.status === 'approved').reduce((acc, w) => acc + w.amount, 0)
      }));
    });

    return () => {
      postsUnsub();
      withdrawalsUnsub();
      usersUnsub();
      allWithdrawalsUnsub();
    };
  }, [user, navigate]);

  const handlePostAction = async (id: string, status: 'approved' | 'rejected') => {
    await updateDoc(doc(db, 'posts', id), { status });
    toast.success(`Post ${status}!`);
  };

  const handleWithdrawalAction = async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const withdrawalRef = doc(db, 'withdrawals', id);
      const withdrawalSnap = await getDoc(withdrawalRef);
      
      if (withdrawalSnap.exists()) {
        const withdrawalData = withdrawalSnap.data();
        await updateDoc(withdrawalRef, { status });
        
        // Get user email to notify
        const userRef = doc(db, 'users', withdrawalData.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          notifyUserWithdrawalStatus({
            userEmail: userData.email,
            userName: userData.displayName,
            amount: withdrawalData.amount,
            status: status === 'approved' ? 'approved' : 'rejected'
          });
        }
      }
      toast.success(`Withdrawal ${status}!`);
    } catch (error) {
      toast.error('Failed to update withdrawal status');
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

  if (user?.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-600" /> Admin Control Panel
        </h1>
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto">
          {['posts', 'withdrawals', 'users', 'settings'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap",
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              )}
            >
              {tab}
            </button>
          ))}
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
        {activeTab === 'posts' && (
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6">Pending Approvals ({pendingPosts.length})</h2>
            <div className="space-y-4">
              {pendingPosts.map(post => (
                <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-gray-900">{post.title}</h4>
                    <p className="text-xs text-gray-500">By {post.authorName} • {post.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePostAction(post.id, 'approved')} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all"><Check className="w-5 h-5" /></button>
                    <button onClick={() => handlePostAction(post.id, 'rejected')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"><Ban className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
              {pendingPosts.length === 0 && <p className="text-center text-gray-400">No pending posts.</p>}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="p-8">
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
                      <button onClick={() => handleWithdrawalAction(req.id, 'approved')} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700">Approve</button>
                      <button onClick={() => handleWithdrawalAction(req.id, 'cancelled')} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700">Cancel</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-400 uppercase tracking-widest font-bold mb-1">Method</p>
                      <p className="text-gray-900 font-medium">{req.method}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 uppercase tracking-widest font-bold mb-1">Details</p>
                      <p className="text-gray-900 font-medium">{req.details}</p>
                    </div>
                  </div>
                </div>
              ))}
              {pendingWithdrawals.length === 0 && <p className="text-center text-gray-400">No pending withdrawals.</p>}
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
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Coins</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Total Earned</th>
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
                    <td className="px-8 py-4 text-sm font-bold">{u.coins.toFixed(0)}</td>
                    <td className="px-8 py-4 text-sm font-bold text-green-600">{u.totalEarned.toFixed(0)}</td>
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
          createdAt: serverTimestamp()
        });
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        // Ensure admin role is synced if it's the admin email
        if (email === 'pishawrichappalhouse@gmail.com') {
          await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
        }
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
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
          createdAt: serverTimestamp()
        });
      } else if (isAdmin) {
        await updateDoc(docRef, { role: 'admin' });
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl shadow-orange-100/50"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-xl shadow-orange-200">
            B
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
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

        <div className="mt-6">
          <button 
            onClick={handleGoogle}
            className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            Continue with Google
          </button>
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
            setUser(docSnap.data() as UserProfile);
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

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900">
          <Toaster position="top-center" richColors />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/post/:id" element={<PostView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create" element={<Editor />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/login" element={<Auth />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-100 py-12 mt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Contact Support</p>
                <p className="text-lg font-bold text-gray-900">+923121130219</p>
              </div>
              <p className="text-xs text-gray-400">© 2026 BlogEarn Inc. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}

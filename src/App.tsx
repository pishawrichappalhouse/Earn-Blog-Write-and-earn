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
  Ban,
  Database
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
import { notifyAdminNewWithdrawal, notifyUserWithdrawalStatus, notifyAdminWithdrawalProcessed } from './services/emailService';
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
  rejectionReason?: string;
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
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') {
      const q = query(collection(db, 'posts'), where('status', '==', 'pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingCount(snapshot.size);
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
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-orange-900/20 group-hover:scale-105 transition-transform duration-300">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-tight text-white leading-none">EarnBlog</span>
                <span className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-1">Premium News</span>
              </div>
            </Link>
            
            <div className="hidden lg:flex items-center gap-8">
              <Link to="/" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/category/Tech" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Tech</Link>
              <Link to="/category/Earning" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Earning</Link>
              <Link to="/category/News" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">News</Link>
              <Link to="/about" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">About</Link>
              <Link to="/contact" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Contact</Link>
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
                <Link 
                  to="/create" 
                  className="bg-orange-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </Link>
                <div className="h-8 w-[1px] bg-white/10 mx-1" />
                <Link to="/dashboard" className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border-2 border-transparent group-hover:border-orange-500 transition-all shadow-inner">
                    {user.photoURL ? <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User className="w-5 h-5" /></div>}
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-xs font-bold text-white leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-orange-500 font-bold mt-1">{user.coins.toFixed(0)} Coins</p>
                  </div>
                </Link>
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl hover:bg-purple-600/30 transition-all border border-purple-500/30 flex items-center gap-2 relative"
                    title="Admin Panel"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="text-xs font-bold hidden xl:block">Admin</span>
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
                <Link to="/" className="p-4 bg-white/5 rounded-2xl text-sm font-bold text-white text-center">Home</Link>
                <Link to="/category/Tech" className="p-4 bg-white/5 rounded-2xl text-sm font-bold text-white text-center">Tech</Link>
                <Link to="/category/Earning" className="p-4 bg-white/5 rounded-2xl text-sm font-bold text-white text-center">Earning</Link>
                <Link to="/category/News" className="p-4 bg-white/5 rounded-2xl text-sm font-bold text-white text-center">News</Link>
              </div>
              
              {user ? (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400 m-3" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{user.displayName}</p>
                      <p className="text-sm text-orange-500 font-bold">{user.coins.toFixed(0)} Coins</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="flex items-center justify-between p-4 bg-purple-600/20 rounded-2xl text-purple-400 font-bold border border-purple-500/30">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5" /> Admin Panel
                      </div>
                      {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse">
                          {pendingCount} Pending
                        </span>
                      )}
                    </Link>
                  )}
                  <Link to="/dashboard" className="block text-lg font-bold text-white">Dashboard</Link>
                  <Link to="/create" className="block text-lg font-bold text-orange-500">Create Post</Link>
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
                E
              </div>
              <span className="text-xl font-bold tracking-tight text-white">EarnBlog</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              The world's leading platform for writers and readers. Share your stories, engage with the community, and earn rewards for your creativity.
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
            <h4 className="text-lg font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors text-sm">About Us</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact Us</Link></li>
              <li><Link to="/create" className="text-gray-400 hover:text-white transition-colors text-sm">Write for Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms & Conditions</Link></li>
              <li><Link to="/disclaimer" className="text-gray-400 hover:text-white transition-colors text-sm">Disclaimer</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-bold mb-6">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-6">Get the latest stories and earning tips delivered to your inbox.</p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm flex-1 focus:outline-none focus:border-orange-500"
              />
              <button className="bg-orange-600 p-2 rounded-xl hover:bg-orange-700 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        <AdBanner position="footer" />

        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} EarnBlog. All rights reserved. Professional Blogging Platform.
          </p>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>Powered by AI Studio</span>
            <span>AdSense Ready</span>
          </div>
        </div>
      </div>
    </footer>
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

const Sidebar = ({ popularPosts }: { popularPosts: BlogPost[] }) => {
  const categories = ['Tech', 'Earning', 'News', 'Lifestyle', 'Finance', 'Health'];
  
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
              to={`/category/${cat.toLowerCase()}`}
              className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-orange-500 hover:text-white transition-all border border-gray-100"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-3xl text-white shadow-xl shadow-orange-900/20">
        <h3 className="text-xl font-bold mb-4">Write & Earn</h3>
        <p className="text-orange-100 text-sm mb-6 leading-relaxed">Share your knowledge with our global community and earn coins for every view.</p>
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

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      where('status', '==', 'approved'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => unsubscribe();
  }, []);

  const featuredPosts = posts.slice(0, 3);
  const latestPosts = posts.slice(3);
  const popularPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, 5);
  const categories = ['Tech', 'Earning', 'News', 'Lifestyle', 'Finance', 'Health'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AdBanner position="top" />

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
                    <span>{featuredPosts[0].authorName}</span>
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
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Latest Posts */}
        <div className="lg:col-span-8 space-y-12">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Latest Articles</h2>
            <div className="h-[2px] bg-gray-100 flex-1" />
          </div>

          <div className="space-y-10">
            {latestPosts.map((post) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row gap-8 group"
              >
                <Link to={`/post/${post.id}`} className="md:w-72 aspect-[4/3] rounded-3xl overflow-hidden shadow-lg flex-shrink-0">
                  <img 
                    src={post.thumbnail || 'https://picsum.photos/seed/article/600/400'} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </Link>
                <div className="flex-1 space-y-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{post.category}</span>
                    <div className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </div>
                  <Link to={`/post/${post.id}`}>
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                    {post.content.substring(0, 180)}...
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {post.authorName[0]}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{post.authorName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <Eye className="w-3.5 h-3.5" /> {post.views}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5" /> 12
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
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

const About = () => (
  <div className="max-w-4xl mx-auto px-4 py-20 prose prose-orange">
    <h1 className="text-5xl font-black mb-10">About EarnBlog</h1>
    <p className="text-xl text-gray-600 leading-relaxed">
      EarnBlog is a premium blogging platform designed for the modern era of digital storytelling. We believe that every voice deserves to be heard and every creator deserves to be rewarded.
    </p>
    <img src="https://picsum.photos/seed/about/1200/600" alt="About Us" className="rounded-[40px] my-12 shadow-2xl" referrerPolicy="no-referrer" />
    <h2>Our Mission</h2>
    <p>
      Our mission is to democratize the world of blogging by providing a high-quality, professional platform where writers can share their expertise and readers can find reliable, engaging content.
    </p>
    <h2>Why Choose Us?</h2>
    <ul>
      <li><strong>Professional Design:</strong> Your content looks premium from day one.</li>
      <li><strong>Earn Rewards:</strong> Get paid for your creativity through our unique coin system.</li>
      <li><strong>Global Community:</strong> Connect with readers and writers from around the world.</li>
    </ul>
  </div>
);

const Contact = () => (
  <div className="max-w-7xl mx-auto px-4 py-20 grid grid-cols-1 lg:grid-cols-2 gap-20">
    <div className="space-y-10">
      <h1 className="text-5xl font-black">Get in Touch</h1>
      <p className="text-xl text-gray-600 leading-relaxed">
        Have a question, feedback, or just want to say hello? We'd love to hear from you. Our team is here to support your blogging journey.
      </p>
      <div className="space-y-6">
        <div className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Us</p>
            <p className="text-lg font-bold text-gray-900">support@earnblog.com</p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Call Us</p>
            <p className="text-lg font-bold text-gray-900">+92 312 1130219</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100">
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
            <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
            <input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="john@example.com" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject</label>
          <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="How can we help?" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</label>
          <textarea rows={6} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="Your message here..." />
        </div>
        <button className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20">
          Send Message
        </button>
      </form>
    </div>
  </div>
);

const LegalPage = ({ title, content }: { title: string, content: string }) => (
  <div className="max-w-4xl mx-auto px-4 py-20 prose prose-orange">
    <h1 className="text-5xl font-black mb-10">{title}</h1>
    <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
      {content}
    </div>
  </div>
);

const PostView = () => {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const { settings } = useAuth();
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

      return () => unsubscribe();
    }
  }, [id, navigate]);

  // Separate effect for incrementing views to avoid infinite loops
  useEffect(() => {
    const incrementViews = async () => {
      if (!id) return;
      const docRef = doc(db, 'posts', id);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as BlogPost;
          const currentUserId = auth.currentUser?.uid;
          
          // Increment views
          await updateDoc(docRef, { views: increment(1) });
          
          // Award coins if viewer is not the author
          if (currentUserId && currentUserId !== data.authorId) {
            const authorRef = doc(db, 'users', data.authorId);
            await updateDoc(authorRef, { 
              coins: increment(settings.coinValuePerView),
              totalEarned: increment(settings.coinValuePerView)
            });
          }
        }
      } catch (error) {
        console.error('Failed to increment views:', error);
      }
    };

    incrementViews();
  }, [id, settings.coinValuePerView]);

  if (!post) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8">
          <AdBanner position="top" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {post.category}
                </span>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MMMM d, yyyy') : 'Recently'}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-6 py-6 border-y border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500">
                    {post.authorName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{post.authorName}</p>
                    <p className="text-xs text-gray-400 font-medium">Author</p>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-gray-100" />
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Eye className="w-4 h-4" /> {post.views} Views
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <MessageSquare className="w-4 h-4" /> 12 Comments
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
                {post.content}
              </div>
            </div>
            
            <div className="flex items-center gap-4 py-10 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Share this story:</span>
              <div className="flex gap-3">
                {['Facebook', 'Twitter', 'LinkedIn', 'WhatsApp'].map(platform => (
                  <button key={platform} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-orange-500 hover:text-white transition-all border border-gray-100">
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <AdBanner position="inline" />

            <Comments postId={post.id} />
          </motion.div>
        </div>

        <div className="lg:col-span-4">
          <Sidebar popularPosts={[]} />
        </div>
      </div>
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
    const isAdmin = user.role === 'admin';
    try {
      await addDoc(collection(db, 'posts'), {
        ...form,
        authorId: user.uid,
        authorName: user.displayName,
        views: 0,
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
      let rejectionReason = '';
      if (status === 'cancelled') {
        rejectionReason = window.prompt('Please enter the reason for rejection:', 'Minimum withdrawal criteria not met') || 'Reason not specified';
      }

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
          
          // Notify User
          notifyUserWithdrawalStatus({
            userEmail: userData.email,
            userName: userData.displayName,
            amount: withdrawalData.amount,
            status: finalStatus,
            rejectionReason: status === 'cancelled' ? rejectionReason : undefined
          });

          // Notify Admin
          notifyAdminWithdrawalProcessed({
            userEmail: userData.email,
            userName: userData.displayName,
            amount: withdrawalData.amount,
            status: finalStatus,
            rejectionReason: status === 'cancelled' ? rejectionReason : undefined
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
            authorName: user?.displayName || 'Admin',
            status: 'approved',
            views: 0,
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" /> Admin Control Panel
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

const CategoryView = () => {
  const { category } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

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
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `posts/${category}`));

    return () => unsubscribe();
  }, [category]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight capitalize">{category} Stories</h1>
        <div className="h-[2px] bg-gray-100 flex-1" />
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{posts.length} Articles</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <motion.div 
            key={post.id}
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
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{post.authorName}</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <Eye className="w-3 h-3" /> {post.views}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
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
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 selection:bg-orange-100 selection:text-orange-900">
          <Toaster position="top-center" richColors />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/category/:category" element={<CategoryView />} />
              <Route path="/post/:id" element={<PostView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create" element={<Editor />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<LegalPage title="Privacy Policy" content={`
Last updated: April 01, 2026

At EarnBlog, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.

1. Information We Collect
We collect information you provide directly to us, such as when you create an account, write a post, or contact us for support. This may include your name, email address, and payment information.

2. How We Use Your Information
We use your information to provide and improve our services, communicate with you, and ensure the security of our platform.

3. Data Security
We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet is 100% secure.

4. Third-Party Services
We may use third-party services, such as Google AdSense, which may collect information about your visits to this and other websites.
              `} />} />
              <Route path="/terms" element={<LegalPage title="Terms & Conditions" content={`
Last updated: April 01, 2026

By using EarnBlog, you agree to comply with and be bound by the following terms and conditions.

1. Content Ownership
You retain ownership of the content you post on EarnBlog. However, by posting, you grant us a non-exclusive, royalty-free license to use, display, and distribute your content.

2. Prohibited Content
You may not post content that is illegal, offensive, or violates the rights of others. We reserve the right to remove any content that violates these terms.

3. Earnings and Payouts
Earnings are based on views and other engagement metrics. Payouts are subject to our verification process and minimum threshold requirements.

4. Limitation of Liability
EarnBlog is provided "as is" without any warranties. We are not liable for any damages arising from your use of the platform.
              `} />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

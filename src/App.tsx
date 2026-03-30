import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { storage, Post, User as UserType } from './services/storage';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

// --- Components ---

const Navbar = ({ user, onLogout }: { user: UserType | null; onLogout: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-200">
                E
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">EarnBlog</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Explore</Link>
              <Link to="/trending" className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Trending</Link>
              {user?.isAdmin && (
                <Link to="/admin" className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search stories..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500 w-64 transition-all"
              />
            </div>

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
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-transparent group-hover:border-orange-500 transition-all" />
                  <div className="hidden lg:block">
                    <p className="text-xs font-bold text-gray-900 leading-none">{user.name}</p>
                    <p className="text-[10px] text-orange-600 font-medium">${user.balance.toFixed(2)}</p>
                  </div>
                </Link>
                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
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
            {user && (
              <Link to="/dashboard" className="w-8 h-8 rounded-full overflow-hidden">
                <img src={user.avatar} alt={user.name} />
              </Link>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
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
              <Link to="/trending" className="block text-lg font-medium text-gray-900">Trending</Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="block text-lg font-medium text-gray-900">Dashboard</Link>
                  <Link to="/create" className="block text-lg font-medium text-orange-600">Write a Story</Link>
                  <button onClick={onLogout} className="block text-lg font-medium text-red-600">Logout</button>
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

const AdBanner = ({ type = 'horizontal' }: { type?: 'horizontal' | 'square' }) => {
  const [adsenseConfig, setAdsenseConfig] = useState(storage.getAdSenseConfig());

  useEffect(() => {
    const handleStorageChange = () => {
      setAdsenseConfig(storage.getAdSenseConfig());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (adsenseConfig?.isEnabled && adsenseConfig.publisherId) {
    return (
      <div className={cn(
        "bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden min-h-[100px] flex items-center justify-center",
        type === 'horizontal' ? "w-full h-32" : "w-full aspect-square"
      )}>
        {/* Real AdSense Ad Unit */}
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client={adsenseConfig.publisherId}
             data-ad-slot="auto"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
             (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </div>
    );
  }

  const ads = [
    { title: 'Master React in 30 Days', desc: 'Join the best-selling course today.', img: 'https://picsum.photos/seed/ad1/400/200' },
    { title: 'Cloud Hosting for Startups', desc: 'Get $200 free credit now.', img: 'https://picsum.photos/seed/ad2/400/200' },
    { title: 'AI Writing Assistant', desc: 'Write 10x faster with AI.', img: 'https://picsum.photos/seed/ad3/400/200' },
  ];
  const ad = ads[Math.floor(Math.random() * ads.length)];

  return (
    <div className={cn(
      "bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden group cursor-pointer transition-all hover:border-orange-200",
      type === 'horizontal' ? "flex h-32" : "flex flex-col"
    )}>
      <div className={cn("relative overflow-hidden", type === 'horizontal' ? "w-1/3" : "h-40")}>
        <img src={ad.img} alt="Ad" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-[10px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ad</div>
      </div>
      <div className="p-4 flex flex-col justify-center flex-1">
        <h4 className="font-bold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">{ad.title}</h4>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.desc}</p>
        <div className="mt-2 flex items-center text-[10px] font-bold text-orange-600 uppercase tracking-widest">
          Learn More <ChevronRight className="w-3 h-3 ml-1" />
        </div>
      </div>
    </div>
  );
};

// --- Pages ---

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    setPosts(storage.getPosts());
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-12">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Latest Stories</h2>
            <div className="flex gap-2">
              {['All', 'Tech', 'Finance', 'Life'].map(cat => (
                <button key={cat} className="px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 hover:border-orange-500 hover:text-orange-600 transition-all">
                  {cat}
                </button>
              ))}
            </div>
          </div>

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
                      src={post.thumbnail} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </Link>
                </div>
                <div className="md:col-span-8 space-y-3">
                  <div className="flex items-center gap-3 text-xs font-bold text-orange-600 uppercase tracking-widest">
                    <span>{post.category}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-gray-400">{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
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
                      <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${post.authorId}/50/50`} alt={post.authorName} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{post.authorName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter">
                        <Eye className="w-3 h-3" /> {post.views}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter text-green-600">
                        <DollarSign className="w-3 h-3" /> {post.earnings.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-12">
          <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Earning Today</h3>
            <p className="text-sm text-gray-600 mb-6">Join 50,000+ creators who are making a living by sharing their stories.</p>
            <Link to="/create" className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">
              Start Writing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Sponsored</h3>
            <AdBanner type="square" />
            <AdBanner type="square" />
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Top Categories</h3>
            <div className="flex flex-wrap gap-2">
              {['Technology', 'Finance', 'Health', 'Travel', 'Food', 'Design', 'Marketing'].map(cat => (
                <button key={cat} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-all">
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostView = () => {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const p = storage.getPost(id);
      if (p) {
        setPost(p);
        storage.incrementViews(id);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  if (!post) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
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
              <img src={`https://picsum.photos/seed/${post.authorId}/100/100`} alt={post.authorName} className="w-10 h-10 rounded-full" />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{post.authorName}</p>
                <p className="text-xs text-gray-400">{format(new Date(post.createdAt), 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Share2 className="w-4 h-4 text-gray-400" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Bell className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
        </div>

        <div className="aspect-video rounded-3xl overflow-hidden bg-gray-100 shadow-2xl">
          <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8">
          <div className="lg:col-span-8">
            <div className="prose prose-orange max-w-none">
              <div className="text-gray-700 text-lg leading-relaxed space-y-6">
                <ReactMarkdown>
                  {post.content}
                </ReactMarkdown>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors">
                  <ThumbsUp className="w-5 h-5" /> <span className="text-sm font-bold">2.4k</span>
                </button>
                <button className="flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors">
                  <MessageSquare className="w-5 h-5" /> <span className="text-sm font-bold">128</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                <Eye className="w-4 h-4" /> {post.views} Views
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Sponsored Content</h3>
              <AdBanner type="square" />
              <div className="bg-gray-900 rounded-3xl p-6 text-white">
                <h4 className="font-bold mb-2">Want to earn like {post.authorName.split(' ')[0]}?</h4>
                <p className="text-xs text-gray-400 mb-4">This post has earned ${post.earnings.toFixed(2)} so far.</p>
                <Link to="/create" className="block text-center bg-orange-600 py-3 rounded-xl text-sm font-bold hover:bg-orange-700 transition-all">
                  Start Your Blog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CreatePost = ({ user }: { user: UserType | null }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Technology');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const generateAIContent = async () => {
    if (!title) return alert('Please enter a title first!');
    setIsGenerating(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a professional blog post about "${title}" in the category of ${category}. Use markdown formatting. Make it engaging and informative.`,
      });
      if (response.text) {
        setContent(response.text);
      }
    } catch (error) {
      console.error('AI Generation failed:', error);
      alert('AI Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    storage.createPost({
      title,
      content,
      category,
      authorId: user.id,
      authorName: user.name,
      thumbnail: `https://picsum.photos/seed/${Math.random()}/800/400`,
    });
    navigate('/dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Create New Story</h1>
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={generateAIContent}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-full font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'AI Write'}
            </button>
            <button 
              type="submit"
              className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              Publish Story
            </button>
          </div>
        </div>

        <div className="space-y-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {['Technology', 'Finance', 'Health', 'Travel', 'Food', 'Design', 'Marketing'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
            <input 
              type="text" 
              placeholder="Enter a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-2xl font-bold focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content (Markdown supported)</label>
            <textarea 
              placeholder="Tell your story..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-4 text-lg min-h-[400px] focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>
      </form>
    </div>
  );
};

const Dashboard = ({ user }: { user: UserType | null }) => {
  const navigate = useNavigate();
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      setUserPosts(storage.getPosts().filter(p => p.authorId === user.id));
    }
  }, [user, navigate]);

  const handleUpgrade = () => {
    if (user && storage.upgradeToPremium(user.id)) {
      alert('Congratulations! You are now a Premium Member. $10.00 has been added to Platform Revenue.');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Stats */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-orange-600 mb-4">
              <div className="p-2 bg-orange-50 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Total Views</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{userPosts.reduce((acc, p) => acc + p.views, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-green-600 mb-4">
              <div className="p-2 bg-green-50 rounded-xl"><DollarSign className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Total Earnings</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${user.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <div className="p-2 bg-blue-50 rounded-xl"><DollarSign className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Available Balance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${user.balance.toFixed(2)}</p>
          </div>
          <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-lg shadow-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><PenSquare className="w-5 h-5" /></div>
              <span className="text-xs font-bold uppercase tracking-widest">Stories Published</span>
            </div>
            <p className="text-3xl font-bold">{userPosts.length}</p>
          </div>
        </div>

        {/* My Posts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">My Stories</h2>
            <Link to="/create" className="text-sm font-bold text-orange-600 hover:underline">Write New</Link>
          </div>
          <div className="space-y-4">
            {userPosts.map(post => (
              <div key={post.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                <img src={post.thumbnail} className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 line-clamp-1">{post.title}</h4>
                  <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>
                    <span className="flex items-center gap-1 text-green-600"><DollarSign className="w-3 h-3" /> {post.earnings.toFixed(2)}</span>
                    <span>{format(new Date(post.createdAt), 'MMM d')}</span>
                  </div>
                </div>
                <Link to={`/post/${post.id}`} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 text-gray-400" /></Link>
              </div>
            ))}
            {userPosts.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <PenSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">You haven't published any stories yet.</p>
                <Link to="/create" className="mt-4 inline-block text-orange-600 font-bold">Start Writing</Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-900 rounded-3xl p-8 text-white">
            <h3 className="text-xl font-bold mb-4">Withdraw Earnings</h3>
            <p className="text-sm text-gray-400 mb-6">Minimum withdrawal is $50.00. You are currently at ${(user.balance / 50 * 100).toFixed(0)}% of your goal.</p>
            <div className="w-full bg-white/10 h-2 rounded-full mb-8 overflow-hidden">
              <div className="bg-orange-600 h-full" style={{ width: `${Math.min(100, (user.balance / 50 * 100))}%` }} />
            </div>
            <button disabled className="w-full py-3 rounded-xl bg-white/10 text-white/50 font-bold cursor-not-allowed">
              Withdraw Funds
            </button>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Earnings Tips</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-[10px] font-bold">1</div>
                <p className="text-xs text-gray-600">Share your stories on social media to increase views.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-[10px] font-bold">2</div>
                <p className="text-xs text-gray-600">Use high-quality thumbnails to improve click-through rates.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-[10px] font-bold">3</div>
                <p className="text-xs text-gray-600">Write consistently to build a loyal audience.</p>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-purple-100">
            <h3 className="text-xl font-bold mb-2">Go Premium</h3>
            <p className="text-sm text-purple-100 mb-6">Get 100% earnings, unlimited AI writing, and a verified badge.</p>
            <button 
              onClick={handleUpgrade}
              className="w-full py-3 bg-white text-purple-700 rounded-xl font-bold hover:bg-purple-50 transition-all"
            >
              Upgrade for $10/mo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = ({ onAuth }: { onAuth: (email: string, name: string, password?: string, isSignUp?: boolean) => void }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      onAuth(email, name, password, isSignUp);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
            E
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-gray-500 mt-2">
            {isSignUp ? 'Join our community of creators today.' : 'Start your journey to financial freedom through writing.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-2xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                required={isSignUp}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-orange-600 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
          <p className="text-[10px] text-gray-400 mt-4">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ user }: { user: UserType | null }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<{
    totalRevenue: number;
    totalPayouts: number;
    withdrawalHistory: { id: string; amount: number; date: string }[];
  }>({ totalRevenue: 0, totalPayouts: 0, withdrawalHistory: [] });
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'adsense'>('users');
  const [adsenseConfig, setAdsenseConfig] = useState(storage.getAdSenseConfig() || { publisherId: '', isEnabled: false });

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
    } else {
      setUsers(storage.getUsers());
      setPosts(storage.getPosts());
      setStats(storage.getPlatformStats());
      setAdsenseConfig(storage.getAdSenseConfig() || { publisherId: '', isEnabled: false });
    }
  }, [user, navigate]);

  const handleSaveAdSense = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateAdSenseConfig(adsenseConfig);
    alert('AdSense settings saved successfully!');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeletePost = (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      storage.deletePost(id);
      setPosts(storage.getPosts());
    }
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user and all their posts?')) {
      storage.deleteUser(id);
      setUsers(storage.getUsers());
      setPosts(storage.getPosts());
    }
  };

  const handlePayout = (userId: string) => {
    storage.updateUserBalance(userId, 0);
    setUsers(storage.getUsers());
    setStats(storage.getPlatformStats());
    alert('Payout successful! Balance reset to $0.');
  };

  const handleWithdrawProfit = () => {
    const profit = storage.withdrawPlatformProfit();
    if (profit > 0) {
      setStats(storage.getPlatformStats());
      alert(`Success! $${profit.toFixed(2)} has been sent to your linked bank account (Simulated).`);
    } else {
      alert('No profit available to withdraw.');
    }
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-600" /> Admin Control Panel
        </h1>
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'users' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'posts' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
          >
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('adsense')}
            className={cn("px-6 py-2 rounded-xl text-sm font-bold transition-all", activeTab === 'adsense' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
          >
            AdSense
          </button>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-purple-600 p-8 rounded-[32px] text-white shadow-xl shadow-purple-100">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Platform Revenue (AdSense)</p>
          <p className="text-4xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Total Payouts to Users</p>
          <p className="text-4xl font-bold text-gray-900">${stats.totalPayouts.toFixed(2)}</p>
        </div>
        <div className="bg-green-600 p-8 rounded-[32px] text-white shadow-xl shadow-green-100 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Net Platform Profit</p>
            <p className="text-4xl font-bold">${(stats.totalRevenue - stats.totalPayouts).toFixed(2)}</p>
          </div>
          <button 
            onClick={handleWithdrawProfit}
            className="mt-6 w-full py-3 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50 transition-all shadow-lg"
          >
            Withdraw Profit
          </button>
        </div>
      </div>

      {/* Withdrawal History */}
      {stats.withdrawalHistory.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" /> Withdrawal History
          </h2>
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">ID</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.withdrawalHistory.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 font-mono text-xs text-gray-400">{w.id}</td>
                    <td className="px-8 py-4 font-bold text-gray-900">${w.amount.toFixed(2)}</td>
                    <td className="px-8 py-4 text-sm text-gray-500">{new Date(w.date).toLocaleDateString()}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {/* ... existing users table ... */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Earnings</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-bold text-gray-900">${u.totalEarnings.toFixed(2)}</td>
                    <td className="px-8 py-6">
                      <span className={cn("font-bold", u.balance >= 50 ? "text-green-600" : "text-gray-900")}>
                        ${u.balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {u.balance >= 50 && (
                          <button 
                            onClick={() => handlePayout(u.id)}
                            className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"
                            title="Process Payout"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'posts' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Story</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Author</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stats</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <img src={p.thumbnail} className="w-12 h-12 rounded-xl object-cover" />
                        <p className="font-bold text-gray-900 line-clamp-1 max-w-xs">{p.title}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-600">{p.authorName}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
                        <span className="flex items-center gap-1 text-green-600"><DollarSign className="w-3 h-3" /> {p.earnings.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => handleDeletePost(p.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                <Settings className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Google AdSense Settings</h2>
                <p className="text-sm text-gray-500">Configure real ads to start earning money from your platform.</p>
              </div>
            </div>

            <form onSubmit={handleSaveAdSense} className="space-y-6">
              <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 mb-8">
                <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> How to get your Publisher ID?
                </h3>
                <p className="text-xs text-orange-800 leading-relaxed">
                  1. Log in to your Google AdSense account.<br />
                  2. Go to <b>Account</b> &gt; <b>Settings</b> &gt; <b>Account Information</b>.<br />
                  3. Copy your <b>Publisher ID</b> (it looks like <code>pub-xxxxxxxxxxxxxxxx</code>).<br />
                  4. Paste it below and enable the ads.
                </p>
                <a 
                  href="https://www.google.com/adsense/start/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
                >
                  Go to Google AdSense <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Publisher ID</label>
                <input 
                  type="text" 
                  placeholder="pub-xxxxxxxxxxxxxxxx"
                  value={adsenseConfig.publisherId}
                  onChange={(e) => setAdsenseConfig({ ...adsenseConfig, publisherId: e.target.value })}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="font-bold text-gray-900">Enable Real Ads</p>
                  <p className="text-xs text-gray-500">Show real Google ads across the site.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setAdsenseConfig({ ...adsenseConfig, isEnabled: !adsenseConfig.isEnabled })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    adsenseConfig.isEnabled ? "bg-orange-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    adsenseConfig.isEnabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <button 
                type="submit"
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
              >
                Save AdSense Configuration
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    setUser(storage.getCurrentUser());
  }, []);

  const handleAuth = (email: string, name: string, password?: string, isSignUp?: boolean) => {
    const user = isSignUp 
      ? storage.signup(email, name, password)
      : storage.signin(email, password);
    setUser(user);
  };

  const handleLogout = () => {
    storage.logout();
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900">
        <Navbar user={user} onLogout={handleLogout} />
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostView />} />
            <Route path="/create" element={<CreatePost user={user} />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/login" element={<Login onAuth={handleAuth} />} />
            <Route path="/trending" element={<Home />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-gray-100 py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2 space-y-6">
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
                  <span className="text-lg font-bold">EarnBlog</span>
                </Link>
                <p className="text-sm text-gray-500 max-w-xs">
                  The world's first decentralized blogging platform where creators keep 100% of their ad revenue.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-4">Platform</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><Link to="/">Explore</Link></li>
                  <li><Link to="/trending">Trending</Link></li>
                  <li><Link to="/create">Write</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-4">Support</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#">Help Center</a></li>
                  <li><a href="#">Terms</a></li>
                  <li><a href="#">Privacy</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-xs text-gray-400">© 2026 EarnBlog Inc. All rights reserved.</p>
              <div className="flex gap-6">
                <a href="#" className="text-gray-400 hover:text-orange-600 transition-colors"><Share2 className="w-4 h-4" /></a>
                <a href="#" className="text-gray-400 hover:text-orange-600 transition-colors"><TrendingUp className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

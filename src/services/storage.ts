export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  totalEarnings: number;
  balance: number;
  isAdmin?: boolean;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  views: number;
  earnings: number;
  category: string;
  thumbnail: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

const STORAGE_KEY = 'earnblog_data';

interface AppData {
  users: User[];
  posts: Post[];
  currentUser: User | null;
  platformStats: {
    totalRevenue: number;
    totalPayouts: number;
    withdrawalHistory: { id: string; amount: number; date: string }[];
  };
  adsterraConfig?: {
    publisherId: string;
    isEnabled: boolean;
  };
}

const INITIAL_DATA: AppData = {
  users: [
    {
      id: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin',
      avatar: 'https://picsum.photos/seed/admin/100/100',
      totalEarnings: 125.50,
      balance: 45.20,
      isAdmin: true,
    }
  ],
  posts: [
    {
      id: '1',
      title: 'How to make money blogging in 2026',
      content: 'Blogging is still one of the best ways to earn passive income. In this post, we explore the latest strategies for monetization...',
      authorId: 'admin',
      authorName: 'Admin User',
      createdAt: new Date().toISOString(),
      views: 1250,
      earnings: 12.50,
      category: 'Finance',
      thumbnail: 'https://picsum.photos/seed/money/800/400',
    },
    {
      id: '2',
      title: 'The Future of AI in Content Creation',
      content: 'AI is changing how we write. From research to drafting, tools like Gemini are becoming essential for modern bloggers...',
      authorId: 'admin',
      authorName: 'Admin User',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      views: 850,
      earnings: 8.50,
      category: 'Technology',
      thumbnail: 'https://picsum.photos/seed/tech/800/400',
    }
  ],
  currentUser: null,
  platformStats: {
    totalRevenue: 540.20,
    totalPayouts: 120.00,
    withdrawalHistory: [],
  },
  adsterraConfig: {
    publisherId: '29004168', // Using Smartlink ID as default
    isEnabled: true,
  }
};

export const storage = {
  getData: (): AppData => {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    let data: AppData;
    if (!dataStr) {
      data = INITIAL_DATA;
    } else {
      data = JSON.parse(dataStr);
      // Ensure default admin always has the password if it's the initial one
      const admin = data.users.find(u => u.id === 'admin');
      if (admin && !admin.password) {
        admin.password = 'admin';
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  },

  saveData: (data: AppData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getPosts: () => storage.getData().posts,

  getPost: (id: string) => storage.getData().posts.find(p => p.id === id),

  createPost: (post: Omit<Post, 'id' | 'views' | 'earnings' | 'createdAt'>) => {
    const data = storage.getData();
    const newPost: Post = {
      ...post,
      id: Math.random().toString(36).substr(2, 9),
      views: 0,
      earnings: 0,
      createdAt: new Date().toISOString(),
    };
    data.posts.unshift(newPost);
    storage.saveData(data);
    return newPost;
  },

  incrementViews: (postId: string) => {
    const data = storage.getData();
    const post = data.posts.find(p => p.id === postId);
    if (post) {
      post.views += 1;
      // High-value niche AdSense: Platform earns $0.15 per view ($150 CPM)
      const platformEarning = 0.15;
      // User earns $0.02 per view ($20 CPM)
      const userEarning = 0.02;
      
      data.platformStats.totalRevenue += platformEarning;
      post.earnings += userEarning;
      
      const author = data.users.find(u => u.id === post.authorId);
      if (author) {
        author.totalEarnings += userEarning;
        author.balance += userEarning;
      }
      
      storage.saveData(data);
    }
  },

  signup: (email: string, name: string, password?: string) => {
    const data = storage.getData();
    if (data.users.find(u => u.email === email)) {
      throw new Error('User already exists');
    }
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      avatar: `https://picsum.photos/seed/${email}/100/100`,
      totalEarnings: 0,
      balance: 0,
    };
    data.users.push(user);
    data.currentUser = user;
    storage.saveData(data);
    return user;
  },

  signin: (email: string, password?: string) => {
    const data = storage.getData();
    const user = data.users.find(u => u.email === email && (!password || u.password === password));
    if (!user) {
      throw new Error('Invalid email or password');
    }
    data.currentUser = user;
    storage.saveData(data);
    return user;
  },

  logout: () => {
    const data = storage.getData();
    data.currentUser = null;
    storage.saveData(data);
  },

  getCurrentUser: () => storage.getData().currentUser,

  // Admin Functions
  getUsers: () => storage.getData().users,

  deletePost: (id: string) => {
    const data = storage.getData();
    data.posts = data.posts.filter(p => p.id !== id);
    storage.saveData(data);
  },

  deleteUser: (id: string) => {
    const data = storage.getData();
    data.users = data.users.filter(u => u.id !== id);
    // Also delete their posts
    data.posts = data.posts.filter(p => p.authorId !== id);
    storage.saveData(data);
  },

  updateUserBalance: (userId: string, amount: number) => {
    const data = storage.getData();
    const user = data.users.find(u => u.id === userId);
    if (user) {
      if (amount === 0) {
        data.platformStats.totalPayouts += user.balance;
      }
      user.balance = amount;
      storage.saveData(data);
    }
  },

  getPlatformStats: () => storage.getData().platformStats,

  withdrawPlatformProfit: () => {
    const data = storage.getData();
    const profit = data.platformStats.totalRevenue - data.platformStats.totalPayouts;
    if (profit > 0) {
      // In a real app, this would trigger a bank transfer
      // Here we reset the stats to show the profit has been "taken"
      const withdrawal = {
        id: Math.random().toString(36).substr(2, 9),
        amount: profit,
        date: new Date().toISOString(),
      };
      data.platformStats.withdrawalHistory.push(withdrawal);
      data.platformStats.totalRevenue = data.platformStats.totalPayouts;
      storage.saveData(data);
      return profit;
    }
    return 0;
  },

  upgradeToPremium: (userId: string) => {
    const data = storage.getData();
    const user = data.users.find(u => u.id === userId);
    if (user) {
      // Monthly subscription fee: $10.00
      const fee = 10.00;
      data.platformStats.totalRevenue += fee;
      user.isAdmin = false; // Just ensuring they aren't admin by mistake
      // In a real app, we'd add a 'isPremium' flag
      storage.saveData(data);
      return true;
    }
    return false;
  },

  getAdsterraConfig: () => storage.getData().adsterraConfig,

  updateAdsterraConfig: (config: { publisherId: string; isEnabled: boolean }) => {
    const data = storage.getData();
    data.adsterraConfig = config;
    storage.saveData(data);
  },
};

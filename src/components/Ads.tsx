import React, { useEffect, useRef } from 'react';

export const AdSocialBar: React.FC = () => {
  useEffect(() => {
    console.log('AdSocialBar: Initializing Adsterra Social Bar...');
    const SCRIPT_ID = 'adsterra-social-bar';
    
    // Check if script already exists to prevent duplicates
    if (document.getElementById(SCRIPT_ID)) {
      console.log('AdSocialBar: Script already exists, skipping load.');
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://valuationappeared.com/b3/65/6b/b3656bf39ce39a84421fc3ec712db405.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => console.log('AdSocialBar: Script loaded successfully.');
    script.onerror = (e) => console.error('AdSocialBar: Script failed to load.', e);
    
    document.body.appendChild(script);

    return () => {
      // For social bar, we might want to keep it active even if component unmounts 
      // but if we really want to clean up:
      // document.body.removeChild(script);
    };
  }, []);
  return null;
};

export const AdPopunder: React.FC = () => {
  useEffect(() => {
    console.log('AdPopunder: Initializing Adsterra Popunder...');
    const SCRIPT_ID = 'adsterra-popunder';

    if (document.getElementById(SCRIPT_ID)) {
      console.log('AdPopunder: Script already exists, skipping load.');
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://valuationappeared.com/3e/fc/70/3efc70e8d99c19daed6c56ef14996d92.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    
    script.onload = () => console.log('AdPopunder: Script loaded successfully.');
    script.onerror = (e) => console.error('AdPopunder: Script failed to load.', e);

    document.body.appendChild(script);
    console.log('AdPopunder: Script added to body.');
    
    return () => {
      // document.body.removeChild(script);
    };
  }, []);
  return null;
};

export const GoogleAdSense: React.FC<{ slot: string; className?: string }> = ({ slot, className }) => {
  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense Error:', e);
    }
  }, []);

  return (
    <div className={`flex justify-center my-6 overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '250px', minHeight: '90px' }}
        data-ad-client="ca-pub-7554219557678246"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export const AdNativeBanner: React.FC = () => {
  return (
    <div className="my-4 flex flex-col items-center justify-center w-full overflow-hidden bg-gray-50/50 rounded-xl">
      <iframe
        title="Native Ad"
        style={{ width: '100%', height: '320px', border: 'none', overflow: 'hidden' }}
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; background: transparent; font-family: sans-serif; }
                #container-18b5e3576860dadf9e5703e77ea1bf8f { width: 100%; min-height: 250px; }
                #container-18b5e3576860dadf9e5703e77ea1bf8f > div { margin: 0 auto !important; }
              </style>
            </head>
            <body>
              <div id="container-18b5e3576860dadf9e5703e77ea1bf8f"></div>
              <script type="text/javascript">
                atOptions = {
                  'key' : '18b5e3576860dadf9e5703e77ea1bf8f',
                  'format' : 'js',
                  'params' : {}
                };
              </script>
              <script type="text/javascript" src="https://valuationappeared.com/18b5e3576860dadf9e5703e77ea1bf8f/invoke.js"></script>
            </body>
          </html>
        `}
      />
    </div>
  );
};

export const AdBanner468x60: React.FC = () => {
  return (
    <div className="my-4 flex justify-center overflow-hidden px-2 w-full bg-gray-50/30 py-2 rounded-lg">
      <iframe
        title="Banner 468x60"
        style={{ width: '468px', height: '60px', border: 'none', overflow: 'hidden' }}
        scrolling="no"
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <style>body { margin:0; padding:0; display: flex; justify-content: center; background: transparent; }</style>
            </head>
            <body>
              <script type="text/javascript">
                atOptions = {
                  'key' : 'c204efdcd9fc62cf37e2eae828137f0f',
                  'format' : 'iframe',
                  'height' : 60,
                  'width' : 468,
                  'params' : {}
                };
              </script>
              <script type="text/javascript" src="https://valuationappeared.com/c204efdcd9fc62cf37e2eae828137f0f/invoke.js"></script>
            </body>
          </html>
        `}
      />
    </div>
  );
};

export const AdBanner728x90: React.FC = () => {
  return (
    <div className="my-4 flex justify-center overflow-hidden px-2 w-full bg-gray-50/30 py-2 rounded-lg">
      <iframe
        title="Banner 728x90"
        style={{ width: '728px', height: '90px', border: 'none', overflow: 'hidden' }}
        scrolling="no"
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <style>body { margin:0; padding:0; display: flex; justify-content: center; background: transparent; }</style>
            </head>
            <body>
              <script type="text/javascript">
                atOptions = {
                  'key' : 'b714ff8dd9804eadbbf14d4ced6ac8c1',
                  'format' : 'iframe',
                  'height' : 90,
                  'width' : 728,
                  'params' : {}
                };
              </script>
              <script type="text/javascript" src="https://valuationappeared.com/b714ff8dd9804eadbbf14d4ced6ac8c1/invoke.js"></script>
            </body>
          </html>
        `}
      />
    </div>
  );
};

export const WelcomeAd: React.FC = () => {
  const [show, setShow] = React.useState(false);
  const [countdown, setCountdown] = React.useState(5);

  useEffect(() => {
    const hasSeenAd = sessionStorage.getItem('hasSeenWelcomeAd');
    if (!hasSeenAd) {
      setShow(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('hasSeenWelcomeAd', 'true');
    // Open smart link in new tab to maximize earnings
    window.open(SMARTLINK_URL, '_blank');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-full mb-4">
            <span className="text-2xl font-bold">Ad</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Supporter Welcome</h3>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Welcome to the future of content. Support us by viewing this brief ad.
          </p>
        </div>
        
        <div className="min-h-[280px] flex items-center justify-center bg-gray-50 rounded-2xl mb-8 overflow-hidden border border-gray-100 ring-4 ring-gray-50/50">
          <div className="scale-110">
            <AdNativeBanner />
          </div>
        </div>

        <button
          onClick={handleClose}
          disabled={countdown > 0}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${
            countdown > 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-b-4 border-gray-200' 
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-200 border-b-4 border-orange-700'
          }`}
        >
          {countdown > 0 ? (
            <>
              <span className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-transparent rounded-full" />
              Loading... {countdown}s
            </>
          ) : (
            'Continue to Story'
          )}
        </button>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            Powered by Global Ads Network
          </p>
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse delay-75" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SMARTLINK_URL = 'https://valuationappeared.com/uiznc96u0i?key=d2c89f38d99d0694da836d364c4733c0';

export const AdSmartLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <a 
      href={SMARTLINK_URL} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={className}
      onClick={() => {
        // Log click for analytics if needed
        console.log('SmartLink Clicked - CPM Boost Triggered');
      }}
    >
      {children}
    </a>
  );
};

export const AntiAdblock: React.FC = () => {
  const [isBlocked, setIsBlocked] = React.useState(false);

  useEffect(() => {
    // Attempt to fetch a common ad script URL to see if it's blocked
    fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { mode: 'no-cors' })
      .then(() => setIsBlocked(false))
      .catch(() => setIsBlocked(true));
  }, []);

  if (!isBlocked) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-red-600/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-500 border border-red-400">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm">Ad-Blocker Detected!</p>
            <p className="text-[10px] text-red-100 opacity-90">Please disable Ad-Blocker to continue earning coins and support our community.</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-red-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 transition-colors"
        >
          I've Disabled It
        </button>
      </div>
    </div>
  );
};

export const HighCPMBooster: React.FC<{ 
  coins: number; 
  onComplete: () => void;
  lastClaimAt?: any;
  lastClaimDate?: string;
  dailyCount?: number;
}> = ({ coins, onComplete, lastClaimAt, lastClaimDate, dailyCount = 0 }) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(0);

  const today = new Date().toLocaleDateString('en-CA');
  const countToday = lastClaimDate === today ? dailyCount : 0;
  const isLimitReached = countToday >= 10;

  useEffect(() => {
    if (!lastClaimAt) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const last = lastClaimAt?.toDate ? lastClaimAt.toDate() : new Date(lastClaimAt);
      const diff = now.getTime() - last.getTime();
      const remaining = Math.max(0, 60000 - diff);
      setTimeLeft(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaimAt]);

  const handleBoost = () => {
    if (timeLeft > 0 || isLimitReached) return;
    
    setIsProcessing(true);
    // Open Smartlink
    window.open(SMARTLINK_URL, '_blank');
    
    // Simulate high-CPM processing time
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 2500);
  };

  const isDisabled = isProcessing || timeLeft > 0 || isLimitReached;

  return (
    <div className={`p-6 bg-gradient-to-br ${isLimitReached ? 'from-gray-600 to-gray-700' : 'from-purple-600 to-indigo-700'} rounded-3xl text-white shadow-xl overflow-hidden relative group transition-all duration-500`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isLimitReached ? 'bg-white/10' : 'bg-white/20'} rounded-xl`}>
              <svg className={`w-5 h-5 ${isLimitReached ? 'text-gray-400' : 'text-yellow-300'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-100 italic">
              {isLimitReached ? 'Limit Reached' : timeLeft > 0 ? 'Cooldown' : 'High-CPM Active'}
            </span>
          </div>
          <div className="text-[10px] font-bold bg-black/20 px-2 py-1 rounded-lg">
            {countToday}/10 Today
          </div>
        </div>

        <h3 className="text-xl font-black mb-2 leading-tight">Super Bonus Reward</h3>
        <p className="text-xs text-purple-100 font-medium mb-6 opacity-80">
          {isLimitReached 
            ? "You've reached your daily limit. Come back tomorrow!" 
            : `Claim your extra reward. Each claim grants you ${coins} coins.`}
        </p>

        <button
          onClick={handleBoost}
          disabled={isDisabled}
          className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3 ${
            isDisabled
              ? 'bg-white/10 text-white/50 cursor-not-allowed'
              : 'bg-white text-indigo-600 hover:bg-yellow-300 hover:text-indigo-900 shadow-lg'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : isLimitReached ? (
            'Come Back Tomorrow'
          ) : timeLeft > 0 ? (
            <>
              <div className="w-4 h-4 border-2 border-white/10 border-t-blue-300 rounded-full animate-spin" />
              Wait {timeLeft}s
            </>
          ) : (
            <>
              Claim {coins} Coins
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

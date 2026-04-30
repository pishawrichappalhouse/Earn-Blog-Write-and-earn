import React, { useEffect, useRef } from 'react';

export const AdSocialBar: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://valuationappeared.com/b3/65/6b/b3656bf39ce39a84421fc3ec712db405.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  return null;
};

export const AdPopunder: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://valuationappeared.com/3e/fc/70/3efc70e8d99c19daed6c56ef14996d92.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  return null;
};

export const AdNativeBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://valuationappeared.com/18b5e3576860dadf9e5703e77ea1bf8f/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="my-4 flex justify-center">
      <div id="container-18b5e3576860dadf9e5703e77ea1bf8f" ref={containerRef}></div>
    </div>
  );
};

export const AdBanner468x60: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set atOptions on window
    (window as any).atOptions = {
      'key' : 'c204efdcd9fc62cf37e2eae828137f0f',
      'format' : 'iframe',
      'height' : 60,
      'width' : 468,
      'params' : {}
    };

    const script = document.createElement('script');
    script.src = 'https://valuationappeared.com/c204efdcd9fc62cf37e2eae828137f0f/invoke.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="my-4 flex justify-center overflow-hidden">
      <div ref={containerRef}></div>
    </div>
  );
};

export const AdBanner728x90: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set atOptions on window
    (window as any).atOptions = {
      'key' : 'b714ff8dd9804eadbbf14d4ced6ac8c1',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    };

    const script = document.createElement('script');
    script.src = 'https://valuationappeared.com/b714ff8dd9804eadbbf14d4ced6ac8c1/invoke.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="my-4 flex justify-center overflow-hidden">
      <div ref={containerRef}></div>
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
    <a href={SMARTLINK_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
};

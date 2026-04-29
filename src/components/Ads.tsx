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

export const SMARTLINK_URL = 'https://valuationappeared.com/uiznc96u0i?key=d2c89f38d99d0694da836d364c4733c0';

export const AdSmartLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <a href={SMARTLINK_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
};

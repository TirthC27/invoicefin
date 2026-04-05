import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans overflow-hidden bg-white">
      {/* ── Left Side (Branding & Hero) ── */}
      <div className="hidden md:flex md:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden bg-white">
        {/* Background Decoration */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-green-50/50 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-50/50 rounded-full blur-[120px]" />
        </div>

        <div
          className="relative z-10 flex flex-col items-start max-w-lg cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform duration-300">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              letterSpacing: '-1px',
              color: '#111827'
            }}>InvoiceFi</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Access global <span className="text-green-600 italic">liquidity</span> instantly
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-gray-500 leading-relaxed mb-8"
          >
            Bridge the divide between real-world trade finance and decentralized liquid markets. The most secure protocol for on-chain invoice financing.
          </motion.p>

          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { label: 'DeFi Native', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
              { label: '99.9% Up-time', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
              { label: 'Instant Flow', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/40 border border-gray-100 backdrop-blur-md px-4 py-2 rounded-full shadow-sm">
                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className="text-xs font-semibold text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Side (Authentication Form) ── */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-green-50/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-green-900/5 p-8 border border-white"
        >
          {/* Header / Toggle */}
          <div className="text-center mb-8">
            <div className="inline-flex p-1 bg-gray-100 rounded-2xl mb-8 w-full relative">
              <motion.div
                layoutId="toggle"
                className="absolute inset-y-1 bg-white rounded-xl shadow-sm z-0"
                style={{
                  left: isLogin ? '4px' : 'calc(50% + 1px)',
                  right: isLogin ? 'calc(50% + 1px)' : '4px'
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
              <button
                onClick={() => setIsLogin(true)}
                className={`relative z-10 flex-1 py-3 text-sm font-bold transition-colors duration-200 ${isLogin ? 'text-gray-900' : 'text-gray-400'}`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`relative z-10 flex-1 py-3 text-sm font-bold transition-colors duration-200 ${!isLogin ? 'text-gray-900' : 'text-gray-400'}`}
              >
                Register
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-sm text-gray-500">
              {isLogin ? 'Enter your details to access your account' : 'Start your journey into on-chain invoice financing'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-500/30 focus:shadow-[0_0_0_4px_rgba(34,197,94,0.1)] outline-none transition-all duration-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Password</label>
                    <button type="button" className="text-xs font-bold text-green-600 hover:text-green-700">Forgot?</button>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-500/30 focus:shadow-[0_0_0_4px_rgba(34,197,94,0.1)] outline-none transition-all duration-300"
                  />
                </div>
                <button
                  type="button"
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all duration-300 mt-6"
                >
                  Sign In
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-500/30 focus:shadow-[0_0_0_4px_rgba(34,197,94,0.1)] outline-none transition-all duration-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-500/30 focus:shadow-[0_0_0_4px_rgba(34,197,94,0.1)] outline-none transition-all duration-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Password</label>
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-500/30 focus:shadow-[0_0_0_4px_rgba(34,197,94,0.1)] outline-none transition-all duration-300"
                  />
                </div>
                <button
                  type="button"
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all duration-300 mt-6"
                >
                  Create Account
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Social / Web3 Auth */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs text-gray-400 font-bold uppercase tracking-widest"><span className="bg-white px-4">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3 border border-gray-100 rounded-xl font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-3 py-3 bg-gray-900 border border-gray-900 rounded-xl font-bold text-sm text-white hover:bg-black active:scale-95 transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M16 12l-4-4-4 4M12 16V8" />
              </svg>
              Wallet
            </button>
          </div>

          <p className="text-center mt-8 text-xs text-gray-400">
            By continuing, you agree to InvoiceFi's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;


import React, { useState, useRef } from 'react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  existingUsers: User[];
}

type AuthStep = 'details' | 'verify';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, existingUsers }) => {
  const [step, setStep] = useState<AuthStep>('details');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [avatar, setAvatar] = useState(`https://picsum.photos/seed/${Math.random()}/200`);
  const [error, setError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@gmail\.com$/
      );
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    if (cleanUsername.length < 1) {
      setError('Username is required');
      return;
    }

    if (password.length < 3) {
      setError('Password must be at least 3 characters');
      return;
    }

    if (!validateEmail(email)) {
      setError('A valid @gmail.com address is required');
      return;
    }

    // Check if user exists
    const existingUser = existingUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (existingUser) {
      if (existingUser.password === password) {
        onLogin(existingUser);
      } else {
        setError('Username taken or incorrect password');
      }
    } else {
      setIsSendingCode(true);
      setTimeout(() => {
        setIsSendingCode(false);
        setStep('verify');
      }, 1500);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode === '1234') { // Mock verification code
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        username: username.trim(),
        password: password,
        email: email.trim(),
        isVerified: true,
        avatar,
        status: 'Online', // Set initial status
        friends: [],
        blockedUsers: [],
        blockedGroups: []
      });
    } else {
      setError('Invalid verification code. Try "1234"');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl p-10 border border-slate-700 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-envelope-open-text text-2xl text-indigo-400"></i>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Verify Gmail</h2>
            <p className="text-slate-400 text-sm mt-2">We sent a 4-digit code to <br/><span className="text-indigo-400 font-bold">{email}</span></p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <input 
              type="text" 
              value={verifyCode}
              maxLength={4}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl px-6 py-4 text-center text-2xl tracking-[1em] text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all font-black"
              placeholder="0000"
              required
            />
            {error && <p className="text-red-500 text-xs font-bold uppercase">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition transform active:scale-95"
            >
              Verify & Enter Hub
            </button>
            <button 
              type="button" 
              onClick={() => setStep('details')}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-400"
            >
              Back to Details
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-indigo-400 mb-2 uppercase tracking-tighter">Azo</h1>
          <p className="text-slate-400 font-medium text-sm">Neural Chat Protocol v3.1</p>
        </div>
        
        <form onSubmit={handleInitialSubmit} className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="relative group cursor-pointer">
              <img 
                src={avatar} 
                alt="Avatar" 
                className="w-24 h-24 rounded-3xl border-4 border-indigo-500 mb-2 object-cover shadow-2xl shadow-indigo-500/20 transition-transform group-hover:scale-105"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fas fa-camera text-white text-xl"></i>
              </button>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setAvatar(`https://picsum.photos/seed/${Math.random()}/200`)} className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Shuffle</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-slate-400">Upload</button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Handle</label>
              <input 
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                placeholder="Username" required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Gmail</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                placeholder="you@gmail.com" required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Password</label>
              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border-2 border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                placeholder="••••••••" required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 rounded-xl font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSendingCode}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-black uppercase tracking-[0.2em] text-xs py-4 rounded-xl shadow-xl shadow-indigo-500/20 transition transform active:scale-95 mt-4"
          >
            {isSendingCode ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i> Sending Code...
              </span>
            ) : 'Verify & Join Hub'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;

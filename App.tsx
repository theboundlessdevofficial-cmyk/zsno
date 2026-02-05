
import React, { useState, useEffect, useRef } from 'react';
import { User, GroupChat, Message, AspectRatio, ImageSize, MemberRole, UserStatus } from './types';
import AuthScreen from './components/AuthScreen';
import ImageGenModal from './components/ImageGenModal';
import { moderateChat } from './services/geminiService';

const INITIAL_USERS: User[] = [
  { id: 'u1', username: 'NeonSkye', email: 'neon@gmail.com', isVerified: true, password: '123', avatar: 'https://picsum.photos/seed/u1/200', status: 'Online', friends: [], blockedUsers: [], blockedGroups: [] },
  { id: 'u2', username: 'PixelWizard', email: 'pixel@gmail.com', isVerified: true, password: '123', avatar: 'https://picsum.photos/seed/u2/200', status: 'Away', friends: [], blockedUsers: [], blockedGroups: [] },
  { id: 'u3', username: 'Echo_Stream', email: 'echo@gmail.com', isVerified: true, password: '123', avatar: 'https://picsum.photos/seed/u3/200', status: 'Online', friends: [], blockedUsers: [], blockedGroups: [] },
  { id: 'u4', username: 'Luna_Dev', email: 'luna@gmail.com', isVerified: true, password: '123', avatar: 'https://picsum.photos/seed/u4/200', status: 'Do Not Disturb', friends: [], blockedUsers: [], blockedGroups: [] },
];

const FORBIDDEN_WORDS = ['spam', 'abuse', 'hate', 'toxic', 'scam', 'badword1', 'badword2'];

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<GroupChat[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'friends'>('chats');
  const [messageInput, setMessageInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [reportTarget, setReportTarget] = useState('');
  const [moderationResult, setModerationResult] = useState<{ verdict: string, reason: string } | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  
  const settingsFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(g => g.id === activeChannelId);
  const currentUserRole: MemberRole | undefined = activeChannel?.roles[currentUser?.id || ''];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChannel?.messages]);

  const applyWordFilter = (text: string): string => {
    let filteredText = text;
    FORBIDDEN_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    return filteredText;
  };

  const handleLogin = (user: User) => {
    const freshUser = { 
      ...user, 
      friends: user.friends || [], 
      blockedUsers: user.blockedUsers || [], 
      blockedGroups: user.blockedGroups || [],
      status: user.status || 'Online'
    };
    if (!allUsers.find(u => u.id === user.id)) {
      setAllUsers(prev => [...prev, freshUser]);
    }
    setCurrentUser(freshUser);
  };

  const handleSendMessage = (e?: React.FormEvent, customImage?: string) => {
    e?.preventDefault();
    if (!currentUser || !activeChannelId || !activeChannel) return;
    
    if (activeChannel.mutedUsers.includes(currentUser.id)) {
      alert("You are currently muted in this hub.");
      return;
    }

    if (!messageInput.trim() && !customImage) return;

    const cleanedText = applyWordFilter(messageInput.trim());

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.username,
      text: cleanedText,
      timestamp: Date.now(),
      type: customImage ? 'image' : 'text',
      imageUrl: customImage
    };

    setChannels(prev => prev.map(c => 
      c.id === activeChannelId 
        ? { ...c, messages: [...c.messages, newMessage] }
        : c
    ));
    setMessageInput('');
  };

  const deleteMessage = (messageId: string) => {
    if (!activeChannelId) return;
    setChannels(prev => prev.map(c => 
      c.id === activeChannelId 
        ? { ...c, messages: c.messages.filter(m => m.id !== messageId) }
        : c
    ));
  };

  const createGroup = (name: string, isPrivate: boolean, pfp: string) => {
    if (!currentUser) return;
    const newGroup: GroupChat = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description: 'A shared hub for conversation.',
      isPrivate,
      pfp,
      ownerId: currentUser.id,
      members: [currentUser.id],
      roles: { [currentUser.id]: 'owner' },
      mutedUsers: [],
      messages: [{ 
        id: 'sys-' + Date.now(), 
        senderId: 'system', 
        senderName: 'System', 
        text: `Hub ${name} launched by ${currentUser.username}.`, 
        timestamp: Date.now(), 
        type: 'system' 
      }]
    };
    setChannels([...channels, newGroup]);
    setActiveChannelId(newGroup.id);
    setIsCreatingGroup(false);
  };

  const manageMemberRole = (userId: string, newRole: MemberRole) => {
    if (!activeChannelId || !currentUser) return;
    setChannels(prev => prev.map(c => {
      if (c.id === activeChannelId) {
        return {
          ...c,
          roles: { ...c.roles, [userId]: newRole }
        };
      }
      return c;
    }));
  };

  const toggleMute = (userId: string) => {
    if (!activeChannelId) return;
    setChannels(prev => prev.map(c => {
      if (c.id === activeChannelId) {
        const isMuted = c.mutedUsers.includes(userId);
        return {
          ...c,
          mutedUsers: isMuted 
            ? c.mutedUsers.filter(id => id !== userId)
            : [...c.mutedUsers, userId]
        };
      }
      return c;
    }));
  };

  const startDM = (otherUser: User) => {
    if (!currentUser) return;
    
    const existingDM = channels.find(c => c.isDM && c.members.includes(otherUser.id) && c.members.includes(currentUser.id));
    
    if (existingDM) {
      setActiveChannelId(existingDM.id);
      setSidebarTab('chats');
      return;
    }

    const newDM: GroupChat = {
      id: `dm-${currentUser.id}-${otherUser.id}-${Date.now()}`,
      name: otherUser.username,
      description: 'Private Direct Message',
      pfp: otherUser.avatar,
      isPrivate: true,
      ownerId: currentUser.id,
      members: [currentUser.id, otherUser.id],
      roles: { [currentUser.id]: 'owner', [otherUser.id]: 'owner' },
      mutedUsers: [],
      isDM: true,
      messages: []
    };

    setChannels([...channels, newDM]);
    setActiveChannelId(newDM.id);
    setSidebarTab('chats');
  };

  const handleUpdateStatus = (newStatus: UserStatus) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, status: newStatus };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setIsStatusMenuOpen(false);
  };

  const toggleFriend = (userId: string) => {
    if (!currentUser) return;
    const updatedFriends = currentUser.friends.includes(userId)
      ? currentUser.friends.filter(id => id !== userId)
      : [...currentUser.friends, userId];
    
    const updatedUser = { ...currentUser, friends: updatedFriends };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  const toggleBlockUser = (userId: string) => {
    if (!currentUser) return;
    const updatedBlocked = currentUser.blockedUsers.includes(userId)
      ? currentUser.blockedUsers.filter(id => id !== userId)
      : [...currentUser.blockedUsers, userId];
    
    const updatedUser = { ...currentUser, blockedUsers: updatedBlocked };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    
    if (activeChannel?.isDM && activeChannel.members.includes(userId)) {
      setActiveChannelId(null);
    }
  };

  const toggleBlockGroup = (groupId: string) => {
    if (!currentUser) return;
    const updatedBlocked = currentUser.blockedGroups.includes(groupId)
      ? currentUser.blockedGroups.filter(id => id !== groupId)
      : [...currentUser.blockedGroups, groupId];
    
    const updatedUser = { ...currentUser, blockedGroups: updatedBlocked };
    setCurrentUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    
    if (activeChannelId === groupId) {
      setActiveChannelId(null);
    }
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    if (deletePassword === currentUser.password) {
      setAllUsers(prev => prev.filter(u => u.id !== currentUser.id));
      setChannels(prev => prev.filter(c => c.ownerId !== currentUser.id));
      setCurrentUser(null);
      setActiveChannelId(null);
      setIsDeletingAccount(false);
      setIsSettingsOpen(false);
      setDeletePassword('');
      setDeleteError('');
    } else {
      setDeleteError('Incorrect password');
    }
  };

  const handleUpdateAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedUser = { ...currentUser, avatar: reader.result as string };
        setCurrentUser(updatedUser);
        setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReport = async () => {
    if (!reportTarget.trim() || !activeChannel) return;
    setIsModerating(true);
    setModerationResult(null);
    const result = await moderateChat(activeChannel.messages, reportTarget);
    setModerationResult(result);
    setIsModerating(false);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} existingUsers={allUsers} />;
  }

  const isDarkMode = theme === 'dark';
  const hubs = channels.filter(c => !c.isDM && !currentUser.blockedGroups.includes(c.id));
  const dms = channels.filter(c => {
    if (!c.isDM) return false;
    const otherMemberId = c.members.find(id => id !== currentUser.id);
    return otherMemberId && !currentUser.blockedUsers.includes(otherMemberId);
  });

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'moderator';

  const getStatusColor = (status: UserStatus) => {
    switch(status) {
      case 'Online': return 'bg-green-500';
      case 'Away': return 'bg-yellow-500';
      case 'Do Not Disturb': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getRoleColor = (role: MemberRole) => {
    switch(role) {
      case 'owner': return 'text-red-500';
      case 'admin': return 'text-purple-500';
      case 'moderator': return 'text-blue-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar */}
      <div className={`w-20 md:w-72 border-r flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-xl'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h1 className={`hidden md:block text-2xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} tracking-tighter`}>Azo</h1>
          <button 
            onClick={() => setIsCreatingGroup(true)}
            className="w-10 h-10 md:w-auto md:px-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white transition flex items-center justify-center shadow-lg shadow-indigo-500/20"
          >
            <i className="fas fa-plus"></i>
            <span className="hidden md:inline ml-2 text-xs font-black uppercase tracking-widest">New Hub</span>
          </button>
        </div>

        <div className={`flex border-b text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setSidebarTab('chats')} className={`flex-1 py-4 transition ${sidebarTab === 'chats' ? (isDarkMode ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-600') : 'text-slate-500'}`}>
            <i className="fas fa-comment-dots mr-2"></i><span className="hidden md:inline">Channels</span>
          </button>
          <button onClick={() => setSidebarTab('friends')} className={`flex-1 py-4 transition ${sidebarTab === 'friends' ? (isDarkMode ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-600') : 'text-slate-500'}`}>
            <i className="fas fa-user-friends mr-2"></i><span className="hidden md:inline">People</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {sidebarTab === 'chats' ? (
            <>
              <div>
                <p className="px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Hubs</p>
                {hubs.map(group => (
                  <button key={group.id} onClick={() => setActiveChannelId(group.id)} className={`w-full flex items-center p-3 mb-2 rounded-2xl transition-all ${activeChannelId === group.id ? (isDarkMode ? 'bg-indigo-600/20 border-l-4 border-indigo-500' : 'bg-indigo-50 border-l-4 border-indigo-600 shadow-sm') : (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100')}`}>
                    <img src={group.pfp} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-md" alt="" />
                    <div className="hidden md:block ml-3 text-left overflow-hidden">
                      <p className="font-bold text-sm truncate">{group.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{group.roles[currentUser.id] || 'member'}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <p className="px-2 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure DMs</p>
                {dms.map(dm => {
                  const otherMemberId = dm.members.find(id => id !== currentUser.id);
                  const otherUser = allUsers.find(u => u.id === otherMemberId);
                  return (
                    <button key={dm.id} onClick={() => setActiveChannelId(dm.id)} className={`w-full flex items-center p-3 mb-2 rounded-2xl transition-all ${activeChannelId === dm.id ? (isDarkMode ? 'bg-indigo-600/20 border-l-4 border-indigo-500' : 'bg-indigo-50 border-l-4 border-indigo-600 shadow-sm') : (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100')}`}>
                      <div className="relative flex-shrink-0">
                        <img src={dm.pfp} className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-indigo-500/20" alt="" />
                        {otherUser && <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 ${getStatusColor(otherUser.status)}`}></div>}
                      </div>
                      <div className="hidden md:block ml-3 text-left overflow-hidden">
                        <p className="font-bold text-sm truncate">{dm.name}</p>
                        {otherUser && <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">{otherUser.status}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                <div key={user.id} className={`flex items-center p-3 rounded-2xl group transition-all ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}>
                  <div className="relative">
                    <img src={user.avatar} className="w-10 h-10 rounded-full shadow-sm" alt="" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 ${getStatusColor(user.status)}`}></div>
                  </div>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{user.username}</p>
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">{user.status}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startDM(user)} className="text-indigo-500 p-2"><i className="fas fa-comment"></i></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`p-5 border-t relative ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isStatusMenuOpen && (
            <div className={`absolute bottom-full left-4 right-4 mb-2 p-2 rounded-2xl border-2 shadow-2xl z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <p className="px-3 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Update Presence</p>
              {(['Online', 'Away', 'Do Not Disturb'] as UserStatus[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => handleUpdateStatus(s)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${currentUser.status === s ? 'bg-indigo-600/10 text-indigo-400' : (isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600')}`}
                >
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(s)}`}></div>
                  {s}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center cursor-pointer group" onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}>
              <div className="relative">
                <img src={currentUser.avatar} className="w-10 h-10 rounded-xl object-cover border-2 border-indigo-500" alt="" />
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-800 shadow-sm ${getStatusColor(currentUser.status)}`}></div>
              </div>
              <div className="hidden md:block ml-3 overflow-hidden">
                <p className="text-sm font-black truncate group-hover:text-indigo-400 transition-colors">{currentUser.username}</p>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{currentUser.status}</p>
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-2xl hover:bg-slate-700 text-slate-400 transition-colors">
              <i className="fas fa-fingerprint"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeChannel ? (
          <>
            <div className={`h-20 border-b flex items-center justify-between px-8 z-10 ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center">
                <div className="relative">
                  <img src={activeChannel.pfp} className={`w-12 h-12 mr-4 object-cover ${activeChannel.isDM ? 'rounded-full' : 'rounded-2xl'}`} alt="" />
                  {activeChannel.isDM && (() => {
                    const otherId = activeChannel.members.find(id => id !== currentUser.id);
                    const otherUser = allUsers.find(u => u.id === otherId);
                    return otherUser && <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${getStatusColor(otherUser.status)}`}></div>;
                  })()}
                </div>
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tighter">{activeChannel.name}</h2>
                  <div className="flex items-center gap-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${getRoleColor(currentUserRole || 'member')}`}>{currentUserRole || 'member'}</p>
                    {activeChannel.mutedUsers.includes(currentUser.id) && <span className="text-[10px] text-red-500 font-black uppercase">MUTED</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!activeChannel.isDM && canManage && (
                  <button onClick={() => setIsMembersOpen(true)} className="text-indigo-400 hover:text-indigo-500 p-2" title="Manage Members">
                    <i className="fas fa-users-cog"></i>
                  </button>
                )}
                <button onClick={() => setIsReportOpen(true)} className="text-slate-400 hover:text-red-400 p-2" title="Neural Audit"><i className="fas fa-shield-halved"></i></button>
                <button onClick={() => setIsImageGenOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">Neural Gen</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeChannel.messages.map(msg => {
                const sender = allUsers.find(u => u.id === msg.senderId);
                return (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} ${msg.type === 'system' ? 'justify-center' : ''}`}>
                    {msg.type === 'system' ? (
                      <div className="px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-slate-800/50 text-slate-500">{msg.text}</div>
                    ) : (
                      <div className="max-w-[85%] md:max-w-[70%] group relative">
                        <div className={`flex items-start gap-4 ${msg.senderId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                          <div className="relative flex-shrink-0">
                            <img src={sender?.avatar || `https://picsum.photos/seed/${msg.senderId}/200`} className="w-10 h-10 rounded-2xl object-cover shadow-xl" alt="" />
                            {sender && <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${getStatusColor(sender.status)}`}></div>}
                          </div>
                          <div className={`px-5 py-4 rounded-3xl border shadow-2xl relative ${msg.senderId === currentUser.id ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none' : (isDarkMode ? 'bg-slate-800 border-slate-700 rounded-tl-none' : 'bg-white border-slate-200 rounded-tl-none')}`}>
                            <div className="flex justify-between items-center gap-4 mb-1">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{msg.senderName}</p>
                              {canManage && (
                                <button onClick={() => deleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity p-1" title="Delete Message">
                                  <i className="fas fa-trash-can text-xs"></i>
                                </button>
                              )}
                            </div>
                            {msg.type === 'image' ? <img src={msg.imageUrl} className="w-full h-auto rounded-2xl" alt="" /> : <p className="text-sm font-medium leading-relaxed">{msg.text}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-8 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="flex gap-5 max-w-6xl mx-auto">
                <input 
                  type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                  disabled={activeChannel.mutedUsers.includes(currentUser.id)}
                  className={`flex-1 border-2 rounded-3xl px-8 py-5 text-sm focus:outline-none transition-all shadow-2xl ${activeChannel.mutedUsers.includes(currentUser.id) ? 'bg-slate-800/50 cursor-not-allowed text-slate-500' : 'bg-slate-800 border-slate-700 text-slate-200'}`}
                  placeholder={activeChannel.mutedUsers.includes(currentUser.id) ? "You are muted" : "Sync message..."}
                />
                <button type="submit" disabled={!messageInput.trim() || activeChannel.mutedUsers.includes(currentUser.id)} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-900">
            <i className="fas fa-shield-cat text-7xl text-slate-700 mb-8 transform rotate-12"></i>
            <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter text-white">Neural Hub</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-medium">Synchronize with a hub to begin transmitting data.</p>
            <button onClick={() => setIsCreatingGroup(true)} className="mt-10 bg-indigo-600 text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest">Launch Hub</button>
          </div>
        )}
      </div>

      {/* Member Management Modal */}
      {isMembersOpen && activeChannel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-lg bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">Hub Members</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manage Roles & Access</p>
              </div>
              <button onClick={() => setIsMembersOpen(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {activeChannel.members.map(memberId => {
                const member = allUsers.find(u => u.id === memberId);
                const role = activeChannel.roles[memberId] || 'member';
                if (!member) return null;
                const isMe = memberId === currentUser.id;
                
                return (
                  <div key={memberId} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-3xl border border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={member.avatar} className="w-10 h-10 rounded-2xl object-cover" alt="" />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${getStatusColor(member.status)}`}></div>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{member.username} {isMe && "(You)"}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${getRoleColor(role)}`}>{role}</p>
                      </div>
                    </div>
                    
                    {!isMe && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleMute(memberId)}
                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${activeChannel.mutedUsers.includes(memberId) ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                          title={activeChannel.mutedUsers.includes(memberId) ? "Unmute" : "Mute"}
                        >
                          <i className={`fas ${activeChannel.mutedUsers.includes(memberId) ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                        </button>

                        {(currentUserRole === 'owner' || (currentUserRole === 'admin' && role !== 'owner' && role !== 'admin')) && (
                          <div className="relative group">
                            <button className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center">
                              <i className="fas fa-user-tag"></i>
                            </button>
                            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 bg-slate-800 border border-slate-700 p-2 rounded-2xl shadow-2xl min-w-[120px]">
                              {['admin', 'moderator', 'member'].map(r => (
                                <button 
                                  key={r}
                                  disabled={role === r}
                                  onClick={() => manageMemberRole(memberId, r as MemberRole)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                                >
                                  Make {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 p-10 shadow-2xl text-white">
            <h2 className="text-3xl font-black mb-8">User Protocol</h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                 <p className="px-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Presence</p>
                 <div className="flex gap-2">
                   {(['Online', 'Away', 'Do Not Disturb'] as UserStatus[]).map(s => (
                     <button 
                       key={s} 
                       onClick={() => handleUpdateStatus(s)}
                       className={`flex-1 py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-tighter ${currentUser.status === s ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                     >
                       {s}
                     </button>
                   ))}
                 </div>
              </div>

              <button onClick={() => setTheme(isDarkMode ? 'light' : 'dark')} className="w-full flex justify-between p-5 bg-slate-900/50 rounded-2xl border border-slate-700 font-bold uppercase tracking-widest text-[10px]">
                Theme Mode <span>{isDarkMode ? 'Dark' : 'Light'}</span>
              </button>
              
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700 flex items-center gap-4">
                <div className="relative">
                  <img src={currentUser.avatar} className="w-16 h-16 rounded-3xl object-cover border-2 border-indigo-500" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-slate-800 ${getStatusColor(currentUser.status)}`}></div>
                </div>
                <div>
                  <p className="font-black text-xl">{currentUser.username}</p>
                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{currentUser.email}</p>
                </div>
              </div>
              <button onClick={() => window.location.reload()} className="w-full py-4 text-slate-500 font-black uppercase tracking-widest">Disconnect</button>
            </div>
          </div>
        </div>
      )}

      {isCreatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-md bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 p-10 shadow-2xl">
            <h2 className="text-4xl font-black mb-10 uppercase tracking-tight text-white">Launch Hub</h2>
            <input id="new-group-name" type="text" className="w-full border-2 border-slate-700 bg-slate-900 rounded-3xl p-5 text-white font-black mb-6 focus:outline-none focus:border-indigo-500" placeholder="Hub Name..." />
            <div className="flex gap-4">
              <button onClick={() => setIsCreatingGroup(false)} className="flex-1 py-5 bg-slate-700 text-white rounded-3xl font-black uppercase">Abort</button>
              <button onClick={() => {
                const name = (document.getElementById('new-group-name') as HTMLInputElement).value;
                if (name) createGroup(name, false, `https://picsum.photos/seed/${name}/400`);
              }} className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest">Deploy</button>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl text-white">
          <div className="w-full max-w-md bg-slate-800 rounded-[2.5rem] border-2 border-slate-700 p-10 shadow-2xl">
            <h2 className="text-4xl font-black mb-10 text-red-500 uppercase tracking-tighter">AI Audit</h2>
            <input type="text" value={reportTarget} onChange={(e) => setReportTarget(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 mb-6 text-white font-black focus:outline-none focus:border-red-500" placeholder="username to scan..." />
            {isModerating && <div className="text-indigo-400 text-center font-black animate-pulse mb-6">SCANNING...</div>}
            {moderationResult && (
              <div className="p-6 bg-red-500/10 border-2 border-red-500/20 rounded-3xl mb-6">
                <p className="font-black text-xl text-red-500">{moderationResult.verdict}</p>
                <p className="text-xs mt-2 italic text-slate-400">{moderationResult.reason}</p>
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={() => { setIsReportOpen(false); setModerationResult(null); }} className="flex-1 py-5 bg-slate-700 rounded-3xl font-black uppercase">Close</button>
              <button onClick={handleReport} className="flex-1 bg-red-600 rounded-3xl font-black uppercase tracking-widest">Execute</button>
            </div>
          </div>
        </div>
      )}

      <ImageGenModal isOpen={isImageGenOpen} onClose={() => setIsImageGenOpen(false)} onImageGenerated={(url) => handleSendMessage(undefined, url)} />
    </div>
  );
};

export default App;

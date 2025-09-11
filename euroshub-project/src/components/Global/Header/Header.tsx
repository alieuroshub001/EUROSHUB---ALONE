'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Menu,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  RefreshCw,
  HelpCircle,
  MessageCircle,
  Calendar,
  Clock,
  X
} from 'lucide-react';
import { getRoleInfo } from '../Sidebar/SidebarLinks';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  unread: boolean;
}

interface HeaderProps {
  onSidebarToggle?: () => void;
  isCollapsed?: boolean;
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbs?: string[];
}

const Header = memo<HeaderProps>(({
  onSidebarToggle = () => {},
  isCollapsed = false,
  title = 'Dashboard',
  showBreadcrumb = true,
  breadcrumbs = []
}) => {
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout: authLogout, isLoading } = useAuth();
  
  const userRole = user?.role || 'employee';
  const userName = user?.name || 'Loading...';
  const userEmail = user?.email || '';
  const userAvatar = user?.avatar || null;
  const roleInfo = getRoleInfo(userRole);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: 1,
      title: 'New project assigned',
      message: 'You have been assigned to Project Alpha',
      time: '5 min ago',
      type: 'info',
      unread: true
    },
    {
      id: 2,
      title: 'Leave request approved',
      message: 'Your vacation request has been approved',
      time: '1 hour ago',
      type: 'success',
      unread: true
    },
    {
      id: 3,
      title: 'Team meeting reminder',
      message: 'Daily standup in 15 minutes',
      time: '2 hours ago',
      type: 'warning',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu(prev => !prev);
    setShowNotifications(false);
  }, []);

  const handleNotificationToggle = useCallback(() => {
    setShowNotifications(prev => !prev);
    setShowUserMenu(false);
  }, []);

  const handleSearchToggle = useCallback(() => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      setTimeout(() => {
        const input = searchRef.current?.querySelector('input');
        input?.focus();
      }, 100);
    }
  }, [showSearch]);

  const handleLogout = useCallback(() => {
    authLogout();
  }, [authLogout]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const formatTime = useCallback((date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const getPageTitle = (): string => {
    if (title) return title;
    const pathSegments = pathname.split('/').filter(Boolean);
    return pathSegments.length > 0 
      ? pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() + pathSegments[pathSegments.length - 1].slice(1)
      : 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile sidebar toggle */}
          <button
            onClick={onSidebarToggle}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
          >
            <Menu size={20} />
          </button>

          {/* Page title and breadcrumb */}
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
            {showBreadcrumb && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <span className="mx-2">/</span>}
                    <span className={index === breadcrumbs.length - 1 ? 'text-gray-900' : 'hover:text-gray-700 cursor-pointer'}>
                      {crumb}
                    </span>
                  </div>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative" ref={searchRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#0fb8af]/20 focus:border-[#0fb8af] transition-colors text-sm placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Date and Time */}
          <div className="hidden lg:flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-50/50 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar size={14} />
              <span>{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-900 font-medium">
              <Clock size={14} />
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={handleSearchToggle}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
          >
            <Search size={18} />
          </button>

          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={handleNotificationToggle}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-900"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500">{unreadCount} unread</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-2 ${
                          notification.unread 
                            ? 'border-l-[#0fb8af] bg-blue-50/30' 
                            : 'border-l-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-[#0fb8af] rounded-full mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="w-full text-sm text-[#0fb8af] hover:text-[#0a9d96] font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0fb8af] flex items-center justify-center">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-24">{userName}</p>
                  <p className={`text-xs ${roleInfo.color} truncate max-w-24`}>{roleInfo.displayName}</p>
                </div>
                <ChevronDown size={14} className="text-gray-600" />
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-600">{userEmail}</p>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.color} mt-1`}>
                      {roleInfo.displayName}
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User size={16} />
                      <span>My Profile</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <HelpCircle size={16} />
                      <span>Help & Support</span>
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-100 py-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      {showSearch && (
        <div className="md:hidden border-t border-gray-200 p-4 bg-white">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#0fb8af]/20 focus:border-[#0fb8af] transition-colors text-sm placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={handleSearchToggle}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
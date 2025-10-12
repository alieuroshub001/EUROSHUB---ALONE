'use client';

import { useState, useCallback, memo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Menu,
  X,
  User
} from 'lucide-react';
import { getNavigationByRole, getRoleInfo, footerLinks, UserRole } from './SidebarLinks';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar = memo<SidebarProps>(({ 
  onCollapseChange = () => {}
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout: authLogout } = useAuth();

  const userRole: UserRole = (user?.role as UserRole) || 'employee';
  const userName: string = user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  const userEmail: string = user?.email || '';
  const navigationLinks = getNavigationByRole(userRole);
  const roleInfo = getRoleInfo(userRole);

  const toggleCollapsed = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange(newCollapsed);
    if (newCollapsed) {
      setExpandedItems(new Set());
    }
  }, [isCollapsed, onCollapseChange]);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen(prev => !prev);
  }, []);

  const toggleExpanded = useCallback((title: string) => {
    if (isCollapsed) return;
    
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  }, [isCollapsed]);

  const handleNavigation = useCallback((path: string, isLogout: boolean = false) => {
    if (isLogout) {
      authLogout();
    } else {
      router.push(path);
    }
    setIsMobileOpen(false);
  }, [router, authLogout]);

  const isActive = useCallback((path: string, hasSubItems: boolean = false): boolean => {
    // Exact match
    if (pathname === path) return true;

    // For items with sub-items, don't highlight parent when child is active
    if (hasSubItems) return false;

    // Special case: Don't highlight role-based root paths (like /superadmin, /admin, etc.)
    // when viewing their sub-pages unless exact match
    const roleRootPaths = ['/superadmin', '/admin', '/client', '/hr', '/employee'];
    if (roleRootPaths.includes(path)) {
      return false; // Already handled by exact match above
    }

    // For items without sub-items, check if current path starts with this path
    // But only if it's followed by a slash to avoid partial matches
    return pathname.startsWith(path + '/');
  }, [pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 flex items-center justify-center">
              <Image 
                src="/logo.png" 
                alt="EurosHub Logo" 
                width={82} 
                height={62} 
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-sm truncate">EurosHub</h2>
              <p className="text-white/60 text-xs">Office Management</p>
            </div>
          </div>
        )}
        
        {/* Desktop collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={toggleMobile}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <User size={20} className="text-white/70" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium text-sm truncate">{userName}</p>
              <p className="text-white/60 text-xs truncate">{userEmail}</p>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.color} mt-1`}>
                {roleInfo.displayName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navigationLinks.map((item) => (
            <div key={item.title}>
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleExpanded(item.title);
                  } else {
                    handleNavigation(item.path);
                  }
                }}
                className={`w-full flex items-center ${item.subItems && !isCollapsed ? 'justify-between' : 'justify-start'} px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive(item.path, !!item.subItems)
                    ? 'bg-[#0fb8af]/20 text-[#0fb8af]'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <item.icon
                    size={18}
                    className={`flex-shrink-0 ${
                      isActive(item.path, !!item.subItems) ? 'text-[#0fb8af]' : ''
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="min-w-0 text-left">
                      <span className="font-medium text-sm truncate block text-left">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="text-xs text-white/50 truncate block text-left">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {!isCollapsed && item.subItems && (
                  <ChevronDown 
                    size={16} 
                    className={`transform transition-transform duration-200 flex-shrink-0 ${
                      expandedItems.has(item.title) ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Sub items */}
              {!isCollapsed && item.subItems && expandedItems.has(item.title) && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.title}
                      onClick={() => handleNavigation(subItem.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(subItem.path, false)
                          ? 'bg-[#0fb8af]/20 text-[#0fb8af]'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <subItem.icon size={16} className="flex-shrink-0" />
                      <span className="truncate text-left">{subItem.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer links */}
      <div className="border-t border-white/10 p-2">
        <div className="space-y-1">
          {footerLinks.map((item) => (
            <button
              key={item.title}
              onClick={() => handleNavigation(item.path, item.isLogout)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                item.isLogout
                  ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  : isActive(item.path, false)
                  ? 'bg-[#0fb8af]/20 text-[#0fb8af]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!isCollapsed && <span className="truncate text-left">{item.title}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/90 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-slate-800/90 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <SidebarContent />
      </aside>

      {/* Main content spacer */}
      <div 
        className={`hidden lg:block transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`} 
      />
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
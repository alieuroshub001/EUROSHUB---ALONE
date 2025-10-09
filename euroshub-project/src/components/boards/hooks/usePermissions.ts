import { useMemo } from 'react';
import { Board, UserRole, Permissions, User } from '../types';

interface UsePermissionsProps {
  user: User | null;
  userRole: UserRole;
  board?: Board | null;
}

export const usePermissions = ({ user, userRole, board }: UsePermissionsProps): Permissions => {
  const permissions = useMemo(() => {
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canArchive: false,
        canCreateLists: false,
        canManageMembers: false,
        canStar: false,
      };
    }

    // Get current user's board role
    const getCurrentUserBoardRole = () => {
      if (!board) return null;
      const member = board.members?.find(m => 
        m.userId?._id === user._id || 
        m.userId?._id === user.id || 
        m.userId?.id === user._id || 
        m.userId?.id === user.id
      );
      return member?.role || null;
    };

    const currentUserBoardRole = getCurrentUserBoardRole();
    const isBoardOwner = board?.createdBy?._id === user?._id || 
                        board?.createdBy?._id === user?.id || 
                        board?.createdBy?.id === user?._id || 
                        board?.createdBy?.id === user?.id;
    const isSystemAdmin = ['superadmin', 'admin'].includes(userRole);

    // Basic permissions
    const canView = true; // If user has access to the board component, they can view
    
    const canEdit = isSystemAdmin || 
                   isBoardOwner || 
                   ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
    
    const canDelete = isSystemAdmin || 
                     isBoardOwner || 
                     currentUserBoardRole === 'owner';
    
    const canArchive = isSystemAdmin || 
                      isBoardOwner || 
                      ['owner', 'admin'].includes(currentUserBoardRole || '');
    
    const canCreateLists = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole) ||
                          ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
    
    const canManageMembers = isSystemAdmin || 
                            isBoardOwner || 
                            ['owner', 'admin'].includes(currentUserBoardRole || '');
    
    const canStar = true; // Any authenticated user can star/unstar boards

    return {
      canView,
      canEdit,
      canDelete,
      canArchive,
      canCreateLists,
      canManageMembers,
      canStar,
    };
  }, [user, userRole, board]);

  return permissions;
};
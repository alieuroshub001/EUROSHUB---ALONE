'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import KanbanBoardPage from '@/app/projects/[id]/boards/[boardId]/page';

export default function SuperAdminBoardPage({
  params
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has super admin role
  if (user && user.role !== 'superadmin') {
    router.push('/');
    return null;
  }

  // Render the main Kanban board page
  return <KanbanBoardPage params={params} />;
}
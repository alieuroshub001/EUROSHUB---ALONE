'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import KanbanBoardPage from '@/app/projects/[id]/boards/[boardId]/page';

export default function AdminBoardPage({
  params
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has admin role
  if (user && user.role !== 'admin') {
    router.push('/');
    return null;
  }

  // Render the main Kanban board page
  return <KanbanBoardPage params={params} />;
}
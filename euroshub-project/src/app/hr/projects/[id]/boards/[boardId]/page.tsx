'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import KanbanBoardPage from '@/app/projects/[id]/boards/[boardId]/page';

export default function HRBoardPage({
  params
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has HR role
  if (user && user.role !== 'hr') {
    router.push('/');
    return null;
  }

  // Render the main Kanban board page
  return <KanbanBoardPage params={params} />;
}
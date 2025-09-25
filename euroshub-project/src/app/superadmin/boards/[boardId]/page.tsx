import BoardView from '@/components/boards/BoardView';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default function SuperAdminBoardPage({ params }: BoardPageProps) {
  return (
    <div className="h-screen">
      <BoardView
        boardId={params.boardId}
        userRole="superadmin"
        baseUrl="/superadmin"
      />
    </div>
  );
}
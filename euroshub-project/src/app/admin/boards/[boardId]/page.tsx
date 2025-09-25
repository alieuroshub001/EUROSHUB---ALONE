import BoardView from '@/components/boards/BoardView';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default function AdminBoardPage({ params }: BoardPageProps) {
  return (
    <div className="h-screen">
      <BoardView
        boardId={params.boardId}
        userRole="admin"
        baseUrl="/admin"
      />
    </div>
  );
}
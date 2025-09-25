import BoardView from '@/components/boards/BoardView';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default function ClientBoardPage({ params }: BoardPageProps) {
  return (
    <div className="h-screen">
      <BoardView
        boardId={params.boardId}
        userRole="client"
        baseUrl="/client"
      />
    </div>
  );
}
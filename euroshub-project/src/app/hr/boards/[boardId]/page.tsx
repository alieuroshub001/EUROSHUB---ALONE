import BoardView from '@/components/boards/BoardView';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default function HRBoardPage({ params }: BoardPageProps) {
  return (
    <div className="h-screen">
      <BoardView
        boardId={params.boardId}
        userRole="hr"
        baseUrl="/hr"
      />
    </div>
  );
}
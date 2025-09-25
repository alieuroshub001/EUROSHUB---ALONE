import BoardView from '@/components/boards/BoardView';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

export default function EmployeeBoardPage({ params }: BoardPageProps) {
  return (
    <div className="h-screen">
      <BoardView
        boardId={params.boardId}
        userRole="employee"
        baseUrl="/employee"
      />
    </div>
  );
}
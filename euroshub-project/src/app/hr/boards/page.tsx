import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import BoardManagement from '@/components/boards/BoardManagement';

export default function HRBoardsPage() {
  return (
    <DashboardLayout
      role="hr"
      title="Boards"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Boards']}
    >
      <BoardManagement userRole="hr" baseUrl="/hr" />
    </DashboardLayout>
  );
}
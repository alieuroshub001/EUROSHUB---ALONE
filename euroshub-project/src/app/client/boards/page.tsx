import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import BoardManagement from '@/components/boards/BoardManagement';

export default function ClientBoardsPage() {
  return (
    <DashboardLayout
      role="client"
      title="Boards"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Boards']}
    >
      <BoardManagement userRole="client" baseUrl="/client" />
    </DashboardLayout>
  );
}
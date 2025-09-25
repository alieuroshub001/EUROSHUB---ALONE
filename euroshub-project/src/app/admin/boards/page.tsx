import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import BoardManagement from '@/components/boards/BoardManagement';

export default function AdminBoardsPage() {
  return (
    <DashboardLayout
      role="admin"
      title="Boards"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Boards']}
    >
      <BoardManagement userRole="admin" baseUrl="/admin" />
    </DashboardLayout>
  );
}
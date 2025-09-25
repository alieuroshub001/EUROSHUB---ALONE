import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import BoardManagement from '@/components/boards/BoardManagement';

export default function SuperAdminBoardsPage() {
  return (
    <DashboardLayout
      role="superadmin"
      title="Boards"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Boards']}
    >
      <BoardManagement userRole="superadmin" baseUrl="/superadmin" />
    </DashboardLayout>
  );
}
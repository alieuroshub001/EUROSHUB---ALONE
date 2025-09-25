import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import BoardManagement from '@/components/boards/BoardManagement';

export default function EmployeeBoardsPage() {
  return (
    <DashboardLayout
      role="employee"
      title="Boards"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Boards']}
    >
      <BoardManagement userRole="employee" baseUrl="/employee" />
    </DashboardLayout>
  );
}
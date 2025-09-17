import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import KanbanBoard from '@/components/Projects/KanbanBoard';

export default function ClientProjectManagement() {
  return (
    <DashboardLayout
      role="client"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <div className="space-y-6">
        <div className="bg-white border-b border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Project Management</h2>
                <p className="text-gray-600 mt-1">Client Dashboard - View and track your projects</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                  Client Access
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <KanbanBoard />
        </div>
      </div>
    </DashboardLayout>
  );
}
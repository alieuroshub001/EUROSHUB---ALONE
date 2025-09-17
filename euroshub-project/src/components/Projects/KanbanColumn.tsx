'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import TaskCard from './TaskCard';

interface Member {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignees?: Member[];
  dueDate?: string;
  tags?: string[];
  comments: number;
  attachments: number;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface KanbanColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onAddTask }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = column.tasks.map(task => task.id);

  return (
    <div className="flex flex-col w-80 bg-gray-100 rounded-lg">
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-900">{column.title}</h3>
          <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-200 rounded-full">
            {column.tasks.length}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onAddTask(column.id)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="Add task"
          >
            <Plus size={16} />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 space-y-3 min-h-[200px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* Empty State */}
        {column.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
              <Plus size={20} />
            </div>
            <p className="text-sm font-medium">No tasks yet</p>
            <button
              onClick={() => onAddTask(column.id)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Add a task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
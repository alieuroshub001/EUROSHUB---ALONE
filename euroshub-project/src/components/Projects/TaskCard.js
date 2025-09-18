'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  MessageCircle, 
  Paperclip, 
  AlertCircle, 
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const TaskCard = ({ task, isDragging = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle size={14} className="text-red-500" />;
      case 'medium':
        return <AlertCircle size={14} className="text-yellow-500" />;
      case 'low':
        return <Clock size={14} className="text-green-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && 
    new Date(task.dueDate) >= new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border border-gray-200 border-l-4 p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all duration-200 ${getPriorityColor(task.priority)}`}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight pr-2 line-clamp-2">
          {task.title}
        </h4>
        {getPriorityIcon(task.priority)}
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div className={`flex items-center space-x-2 mb-3 text-xs ${
          isOverdue 
            ? 'text-red-600' 
            : isDueSoon 
              ? 'text-yellow-600' 
              : 'text-gray-500'
        }`}>
          <Calendar size={12} />
          <span>
            Due {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
          {isOverdue && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
              Overdue
            </span>
          )}
          {isDueSoon && !isOverdue && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
              Due Soon
            </span>
          )}
        </div>
      )}

      {/* Task Footer */}
      <div className="flex items-center justify-between">
        {/* Assignees */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {task.assignees?.slice(0, 3).map((assignee, index) => (
              <div
                key={assignee.id || index}
                className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                title={assignee.name || assignee}
              >
                {(assignee.name || assignee).split(' ').map(n => n[0]).join('')}
              </div>
            ))}
            {task.assignees?.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
          
          {(!task.assignees || task.assignees.length === 0) && (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Activity Icons */}
        <div className="flex items-center space-x-3 text-gray-400">
          {task.attachments > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Paperclip size={12} />
              <span>{task.attachments}</span>
            </div>
          )}
          {task.comments > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <MessageCircle size={12} />
              <span>{task.comments}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
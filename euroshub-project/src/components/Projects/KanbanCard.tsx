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
  AlertTriangle,
  Flag
} from 'lucide-react';
import { Card } from '@/types/project';
import { format, isToday, isPast, isThisWeek } from 'date-fns';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onClick?: () => void;
}

const KanbanCard = ({ card, isDragging = false, onClick }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.7 : 1,
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle size={14} className="text-red-600" />;
      case 'high':
        return <Flag size={14} className="text-red-500" />;
      case 'medium':
        return <AlertCircle size={14} className="text-yellow-500" />;
      case 'low':
        return <Clock size={14} className="text-green-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-600 bg-red-50';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-purple-100 text-purple-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = card.dueDate && isPast(new Date(card.dueDate)) && card.status !== 'completed';
  const isDueSoon = card.dueDate && (isToday(new Date(card.dueDate)) || isThisWeek(new Date(card.dueDate)));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 border-l-4 p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${getPriorityColor(card.priority)} ${
        isDragging || isSortableDragging ? 'shadow-lg scale-105' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm leading-tight pr-2 line-clamp-2 flex-1">
          {card.title}
        </h4>
        <div className="flex items-center space-x-1">
          {getPriorityIcon(card.priority)}
          {card.status === 'completed' && (
            <CheckCircle2 size={14} className="text-green-600" />
          )}
        </div>
      </div>

      {/* Card Description */}
      {card.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Status Badge */}
      {card.status !== 'open' && (
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(card.status)}`}>
            {card.status.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
                border: `1px solid ${label.color}40`
              }}
            >
              {label.name}
            </span>
          ))}
          {card.labels.length > 3 && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
              +{card.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Due Date */}
      {card.dueDate && (
        <div className={`flex items-center space-x-2 mb-3 text-xs ${
          isOverdue
            ? 'text-red-600'
            : isDueSoon
              ? 'text-yellow-600'
              : 'text-gray-500'
        }`}>
          <Calendar size={12} />
          <span>
            Due {format(new Date(card.dueDate), 'MMM dd')}
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

      {/* Checklist Progress */}
      {card.checklist && card.checklist.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <CheckCircle2 size={12} />
            <span>{card.checklistCompletion}% ({card.checklist.filter(item => item.completed).length}/{card.checklist.length})</span>
          </div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${card.checklistCompletion}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between">
        {/* Assignees */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1">
            {card.assignedTo?.slice(0, 3).map((assignee, index) => (
              <div
                key={assignee._id || index}
                className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                title={assignee.name}
              >
                {assignee.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
            {card.assignedTo && card.assignedTo.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                +{card.assignedTo.length - 3}
              </div>
            )}
          </div>

          {(!card.assignedTo || card.assignedTo.length === 0) && (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Activity Icons */}
        <div className="flex items-center space-x-3 text-gray-400">
          {card.attachments && card.attachments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Paperclip size={12} />
              <span>{card.attachments.length}</span>
            </div>
          )}
          {card.comments && card.comments.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <MessageCircle size={12} />
              <span>{card.comments.length}</span>
            </div>
          )}
          {card.timeTracking && card.timeTracking.spent > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <Clock size={12} />
              <span>{card.timeTracking.spent}h</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
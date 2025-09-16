'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import {
  Calendar,
  MessageSquare,
  Paperclip,
  CheckSquare,
  User,
  AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';

interface Card {
  _id: string;
  title: string;
  description?: string;
  position: number;
  list: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  isCompleted: boolean;
  assignedMembers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  labels: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  attachmentCount: number;
  commentCount: number;
  checklistProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

interface KanbanCardProps {
  card: Card;
  onClick: () => void;
  isDragging?: boolean;
}

const priorityColors = {
  low: 'border-green-200',
  medium: 'border-yellow-200',
  high: 'border-orange-200',
  urgent: 'border-red-200'
};

const priorityDots = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500'
};

export default function KanbanCard({ card, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: card._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && !card.isCompleted;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg shadow-sm border-l-4 p-3 cursor-pointer hover:shadow-md transition-shadow',
        priorityColors[card.priority],
        card.isCompleted && 'opacity-60'
      )}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 4).map((label) => (
            <span
              key={label._id}
              className="inline-block w-8 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
          {card.labels.length > 4 && (
            <span className="text-xs text-gray-500">+{card.labels.length - 4}</span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className={clsx(
        'text-sm font-medium text-gray-900 mb-2 line-clamp-2',
        card.isCompleted && 'line-through'
      )}>
        {card.title}
      </h4>

      {/* Description Preview */}
      {card.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Checklist Progress */}
      {card.checklistProgress && card.checklistProgress.total > 0 && (
        <div className="flex items-center space-x-2 mb-2">
          <CheckSquare className="w-3 h-3 text-gray-500" />
          <div className="flex-1 bg-gray-200 rounded-full h-1">
            <div
              className={clsx(
                'h-1 rounded-full transition-all',
                card.checklistProgress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
              )}
              style={{ width: `${card.checklistProgress.percentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">
            {card.checklistProgress.completed}/{card.checklistProgress.total}
          </span>
        </div>
      )}

      {/* Due Date */}
      {card.dueDate && (
        <div className={clsx(
          'flex items-center space-x-1 mb-2',
          isOverdue ? 'text-red-600' : 'text-gray-600'
        )}>
          <Calendar className="w-3 h-3" />
          <span className="text-xs">
            {format(new Date(card.dueDate), 'MMM d')}
          </span>
          {isOverdue && <AlertTriangle className="w-3 h-3" />}
        </div>
      )}

      {/* Bottom Row */}
      <div className="flex items-center justify-between mt-2">
        {/* Priority Indicator and Stats */}
        <div className="flex items-center space-x-2">
          <div className={clsx('w-2 h-2 rounded-full', priorityDots[card.priority])} />

          <div className="flex items-center space-x-2 text-gray-500">
            {card.commentCount > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare className="w-3 h-3" />
                <span className="text-xs">{card.commentCount}</span>
              </div>
            )}

            {card.attachmentCount > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="w-3 h-3" />
                <span className="text-xs">{card.attachmentCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Members */}
        {card.assignedMembers.length > 0 && (
          <div className="flex -space-x-1">
            {card.assignedMembers.slice(0, 3).map((member) => (
              <div
                key={member._id}
                className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center overflow-hidden"
                title={`${member.firstName} ${member.lastName}`}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-600 font-medium">
                    {member.firstName[0]}{member.lastName[0]}
                  </span>
                )}
              </div>
            ))}
            {card.assignedMembers.length > 3 && (
              <div className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs text-gray-600 font-medium">
                  +{card.assignedMembers.length - 3}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
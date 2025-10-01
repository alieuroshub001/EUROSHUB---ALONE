'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../lists/ListContainer';

interface SortableCardProps {
  card: Card;
  onClick: (cardId: string) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, onClick }) => {
  const {
    attributes,
    
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card._id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    if (!isDragging) {
      onClick(card._id);
    }
  };

  const cardStyle = {
    ...style,
    backgroundColor: card.color || undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`${card.color ? '' : 'bg-white dark:bg-gray-800'} rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
    >

      {/* Cover Image */}
      {card.coverImage && (
        <div
          className="h-32 rounded-lg mb-3 bg-cover bg-center"
          style={{ backgroundImage: `url(${card.coverImage})` }}
        />
      )}

      {/* Card Title */}
      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {card.title}
      </h4>

      {/* Card Description (if exists) */}
      {card.description && (
        <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((label, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
            >
              {label}
            </span>
          ))}
          {card.labels.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
              +{card.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Due date and Members */}
      <div className="flex items-center justify-between">
        {/* Due Date */}
        {card.dueDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Due {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Members */}
        <div className="flex -space-x-1">
          {card.members.slice(0, 3).map((member, index) => (
            <div
              key={member.userId?._id || `sortable-member-${index}`}
              className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium"
              title={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
            >
              {member.userId?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.userId.avatar}
                  alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 dark:text-gray-300">
                  {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || '?'}
                </span>
              )}
            </div>
          ))}
          {card.members.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white">
              +{card.members.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SortableCard;
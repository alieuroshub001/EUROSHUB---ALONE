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


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer group overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Card Cover - Image (full height) or Color (smaller with title inside) */}
      {card.coverImage ? (
        <>
          <div className="w-full h-40 overflow-hidden rounded-t-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.coverImage}
              alt={card.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          {/* Card Title below image */}
          <div className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
              {card.title}
            </h4>
          </div>
        </>
      ) : card.color ? (
        <div
          className="w-full h-24 px-4 py-3 flex items-center rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}ee 100%)`,
          }}
        >
          {/* Card Title inside colored card */}
          <h4 className="font-medium text-white text-sm line-clamp-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            {card.title}
          </h4>
        </div>
      ) : (
        <div className="p-4">
          {/* Card Title for cards without image or color */}
          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
            {card.title}
          </h4>
        </div>
      )}

      {/* Content - Only show for cards without cover image/color */}
      {!card.coverImage && !card.color && (
        <div className="px-3 pb-3">
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {card.labels.slice(0, 2).map((label, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                >
                  {label}
                </span>
              ))}
              {card.labels.length > 2 && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 text-xs rounded-full">
                  +{card.labels.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Footer - Only show if there's relevant content */}
          {(card.dueDate || card.members.length > 0) && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Due Date */}
              {card.dueDate && (
                <span className="text-xs">
                  {new Date(card.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}

              {/* Members */}
              {card.members.length > 0 && (
                <div className="flex -space-x-1">
                  {card.members.slice(0, 3).map((member, index) => (
                    <div
                      key={member.userId?._id || `sortable-member-${index}`}
                      title={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                    >
                      {member.userId?.avatar ? (
                        // User has avatar - display image only without background
                        <div className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={member.userId.avatar}
                            alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        // User has no avatar - display initials with background color
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white"
                          style={{
                            backgroundColor: `hsl(${(index * 137.5) % 360}, 45%, 55%)`
                          }}
                        >
                          {member.userId?.firstName?.charAt(0) || '?'}
                          {member.userId?.lastName?.charAt(0) || ''}
                        </div>
                      )}
                    </div>
                  ))}
                  {card.members.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                        +{card.members.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SortableCard;
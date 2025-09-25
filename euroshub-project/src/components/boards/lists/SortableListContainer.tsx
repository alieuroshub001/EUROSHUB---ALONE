'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ListContainer, { ListContainerProps } from './ListContainer';

interface SortableListContainerProps extends ListContainerProps {
  id: string;
}

const SortableListContainer: React.FC<SortableListContainerProps> = ({
  id,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'list',
      list: props.list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'z-50' : ''}`}
    >
      <ListContainer
        {...props}
        dragHandleProps={{
          attributes,
          listeners,
          isDragging
        }}
      />
    </div>
  );
};

export default SortableListContainer;
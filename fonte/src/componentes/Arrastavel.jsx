// Envolve seções e itens para o dnd-kit. A alça (⠿) é o único ponto de arrasto,
// então tocar e rolar a página no celular continua funcionando.
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export function Arrastavel({ id, dados, as: Tag = 'div', className = '', children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, data: dados });
  const estilo = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: isDragging ? 'relative' : undefined,
  };
  const alca = (rotulo = 'Arrastar para mover') => (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={rotulo}
      title={rotulo}
      className="inline-grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-tinta-2 hover:bg-verde-fundo hover:text-tinta active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <Tag ref={setNodeRef} style={estilo} className={`${className} ${isDragging ? 'opacity-80 shadow-xl' : ''}`}>
      {children(alca)}
    </Tag>
  );
}

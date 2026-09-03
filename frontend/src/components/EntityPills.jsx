import { ENTITIES } from '../services/api';

export default function EntityPills({ selectedEntities = [], onChange }) {
  function toggleEntity(id) {
    if (!onChange) return;
    if (selectedEntities.includes(id)) {
      if (selectedEntities.length === 1) return; // Keep at least one selected
      onChange(selectedEntities.filter(x => x !== id));
    } else {
      onChange([...selectedEntities, id]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ENTITIES.map(e => {
        const isActive = selectedEntities.includes(e.id);
        return (
          <button
            key={e.id}
            type="button"
            className={`select-none rounded-full px-4.5 py-1.5 text-[12.5px] font-semibold transition-all outline-none ${isActive
                ? 'border border-blue-600 bg-blue-600 text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)]'
                : 'border border-slate-300 bg-white text-slate-600 hover:border-blue-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            onClick={() => toggleEntity(e.id)}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}

import { ENTITIES } from '../services/api';
import styles from './EntityPills.module.css';

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
    <div className={styles.entityPills}>
      {ENTITIES.map(e => {
        const isActive = selectedEntities.includes(e.id);
        return (
          <button
            key={e.id}
            type="button"
            className={`${styles.pill} ${isActive ? styles.pillActive : styles.pillInactive}`}
            onClick={() => toggleEntity(e.id)}
          >
            {e.label}
          </button>
        );
      })}
    </div>
  );
}

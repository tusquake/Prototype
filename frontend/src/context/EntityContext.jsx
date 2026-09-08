import { createContext, useContext, useState } from 'react';
import { ENTITIES } from '../services/api';

const EntityContext = createContext();

export const EntityProvider = ({ children }) => {
  const [selectedEntities, setSelectedEntities] = useState([ENTITIES[0].id]);

  const toggleEntity = (id) => {
    setSelectedEntities((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

    return (
      <EntityContext.Provider value={{ selectedEntities, toggleEntity }}>
        {children}
      </EntityContext.Provider>
    );
};

export const useEntity = () => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
};
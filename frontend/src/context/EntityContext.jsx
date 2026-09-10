import { createContext, useContext, useState, useEffect } from 'react';
import { ENTITIES, fetchEntities } from '../services/api';

const EntityContext = createContext();

export const EntityProvider = ({ children }) => {
  const [entities, setEntities] = useState(ENTITIES);
  const [selectedEntities, setSelectedEntities] = useState([ENTITIES[0].id]);

  useEffect(() => {
    fetchEntities().then(fetched => {
      if (fetched && fetched.length > 0) {
        setEntities(fetched);
        setSelectedEntities(prev => {
          const valid = prev.filter(id => fetched.some(e => e.id === id));
          return valid.length > 0 ? valid : [fetched[0].id];
        });
      }
    });
  }, []);

  const toggleEntity = (id) => {
    setSelectedEntities((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <EntityContext.Provider value={{ entities, selectedEntities, toggleEntity }}>
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
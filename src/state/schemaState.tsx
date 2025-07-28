import React, { createContext, useContext, useState } from 'react';

export interface SchemaData {
  code: string;
  libraries?: string;
}

interface SchemaState {
  schemas: Record<string, SchemaData>;
  setSchema: (blockId: string, data: SchemaData) => void;
  getSchema: (blockId: string) => SchemaData;
}

const defaultSchema = {
  code: '',
  libraries: '',
};

const SchemaContext = createContext<SchemaState | undefined>(undefined);

export const SchemaProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [schemas, setSchemas] = useState<Record<string, SchemaData>>({});

  const setSchema = (blockId: string, data: SchemaData) => {
    setSchemas(prev => ({
      ...prev,
      [blockId]: data,
    }));
  };

  const getSchema = (blockId: string) => {
    return schemas[blockId] || { ...defaultSchema };
  };

  return (
    <SchemaContext.Provider value={{ schemas, setSchema, getSchema }}>
      {children}
    </SchemaContext.Provider>
  );
};

export const useSchemaState = () => {
  const context = useContext(SchemaContext);
  if (!context) {
    throw new Error('useSchemaState must be used within a SchemaProvider');
  }
  return context;
};

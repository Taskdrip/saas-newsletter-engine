import React, { createContext, useContext, useState, useEffect } from 'react';
import { useListWorkspaces, Workspace } from '@workspace/api-client-react';
import { useUser } from '@clerk/react';

interface WorkspaceContextType {
  workspaceId: number | null;
  setWorkspaceId: (id: number) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  setWorkspaceId: () => {},
  workspaces: [],
  activeWorkspace: null,
  isLoading: true,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const { data: workspaces = [], isLoading } = useListWorkspaces(undefined, {
    query: { enabled: !!isSignedIn } as any
  });
  
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    if (workspaces.length > 0 && workspaceId === null) {
      setWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, workspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === workspaceId) || null;

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId, workspaces, activeWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);

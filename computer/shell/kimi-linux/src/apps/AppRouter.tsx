import type { FC } from 'react';
import FileManager from './FileManager';
import TextEditor from './TextEditor';
import CodeEditor from './CodeEditor';
import Chat from './Chat';
import Ingest from './Ingest';
import { Terminal as DonorUserTerminal } from './DonorUserTerminal';
import SystemTerminal from './SystemTerminal';
import { GroveStore as DonorGroveStore } from './DonorGroveStore';
import Settings from './Settings';
interface AppRouterProps { appId: string; windowId: string; }
const AppRouter: FC<AppRouterProps> = ({ appId }) => {
  switch (appId) {
    case 'filemanager': return <FileManager />;
    case 'settings': return <Settings />;
    case 'texteditor': return <TextEditor />;
    case 'codeeditor': return <CodeEditor />;
    case 'chat': return <Chat />;
    case 'ingest': return <Ingest />;
    case 'terminal': return <DonorUserTerminal />;
    case 'system-terminal': return <SystemTerminal />;
    case 'grovestore': return <DonorGroveStore />;
    default: return <div className="p-4">This application is not installed.</div>;
  }
};
export default AppRouter;

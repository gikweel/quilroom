import { Routes, Route } from 'react-router-dom';
import DocList from './pages/DocList';
import Editor from './pages/Editor';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DocList />} />
      <Route path="/d/:docId" element={<Editor />} />
    </Routes>
  );
}

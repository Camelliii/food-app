import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RecipeHome from './pages/RecipeHome';
import RecipeDetail from './pages/RecipeDetail';
import TodoList from './pages/TodoList';
import Inventory from './pages/Inventory';
import RecipeImport from './pages/RecipeImport';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/recipes" element={<RecipeHome />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/todo" element={<TodoList />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/import" element={<RecipeImport />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;


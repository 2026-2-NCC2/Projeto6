import { HashRouter, Route, Routes } from "react-router";
import Layout from "./components/Layout.jsx";
import { ForumProvider } from "./store/ForumContext.jsx";
import Home from "./pages/Home.jsx";
import Community from "./pages/Community.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import CreatePost from "./pages/CreatePost.jsx";
import NotFound from "./pages/NotFound.jsx";

// HashRouter: funciona em qualquer hospedagem estática (ex.: GitHub Pages).
export default function App() {
  return (
    <ForumProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="r/:slug" element={<Community />} />
            <Route path="r/:slug/post/:id" element={<PostDetail />} />
            <Route path="criar" element={<CreatePost />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </ForumProvider>
  );
}

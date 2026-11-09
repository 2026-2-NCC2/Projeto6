import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router";
import Layout from "./components/Layout.jsx";
import { ForumProvider } from "./store/ForumContext.jsx";
import Home from "./pages/Home.jsx";
import Community from "./pages/Community.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import CreatePost from "./pages/CreatePost.jsx";
import NotFound from "./pages/NotFound.jsx";


function LegacyCommunityRedirect() {
  const { slug, "*": rest = "" } = useParams();
  const location = useLocation();
  return (
    <Navigate
      to={`/t/${slug}${rest ? `/${rest}` : ""}${location.search}${location.hash}`}
      replace
    />
  );
}

// HashRouter: funciona em qualquer hospedagem estática (ex.: GitHub Pages).
export default function App() {
  return (
    <ForumProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="t/:slug" element={<Community />} />
            <Route path="t/:slug/post/:id" element={<PostDetail />} />
            <Route path="r/:slug/*" element={<LegacyCommunityRedirect />} />
            <Route path="criar" element={<CreatePost />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </ForumProvider>
  );
}

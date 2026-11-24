import { Link } from "react-router";
import { Vazio } from "../components/Common.jsx";

export default function NotFound({ titulo = "Página não encontrada" }) {
  return (
    <main className="col-principal col-larga" tabIndex={-1}>
      <section className="card">
        <Vazio icone="info" titulo={titulo}>
          O conteúdo pode ter sido removido ou o endereço está incorreto. <Link to="/">Voltar ao feed</Link>
        </Vazio>
      </section>
    </main>
  );
}

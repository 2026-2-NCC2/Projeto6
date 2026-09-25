import { useParams } from 'react-router';
import { EventEditor } from '../src/pages/Organizer';
import { Quote } from '../src/pages/Supplier';
import { EventDetails } from '../src/pages/Participant';

function Info({ title, children }) {
  return (
    <div className="workspace narrow">
      <section className="panel">
        <h1>{title}</h1>
        <p>{children}</p>
        <Link className="button primary" to="/perfis">
          Explorar os perfis
        </Link>
      </section>
    </div>
  );
}

function EventEditorRoute() {
  const { id } = useParams();
  return <EventEditor key={id} />;
}
function QuoteRoute() {
  const { id } = useParams();
  return <Quote key={id} />;
}

function EventDetailsRoute({ organizer = false }) {
  const { id } = useParams();
  return <EventDetails key={`${organizer}-${id}`} organizer={organizer} />;
}
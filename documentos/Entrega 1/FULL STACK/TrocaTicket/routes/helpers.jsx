import { useParams } from 'react-router';
import { EventEditor } from '../src/pages/Organizer';

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
import { Routes, Route } from 'react-router';
import { Organizer, Consolidation } from '../src/pages/Organizer';
import SupplierDirectory from '../src/pages/SupplierDirectory';
import { EventEditorRoute, EventDetailsRoute } from './helpers';
import { EventEditor } from '../src/pages/Organizer';

export default function OrganizerRoutes() {
    return(
        <Routes>
            <Route index element={<Organizer />}/>
            <Route path="eventos" element={<Organizer list />} />
            <Route path="novo" element={<EventEditor key="new" />} />
            <Route path="eventos/:id/editar" element={<EventEditorRoute />} />
            <Route path="eventos/:id/consolidar" element={<Consolidation />} />
            <Route path="fornecedores" element={<SupplierDirectory />} />
            <Route path="visualizar/:id" element={<EventDetailsRoute organizer />}/>
        </Routes>
    );
}
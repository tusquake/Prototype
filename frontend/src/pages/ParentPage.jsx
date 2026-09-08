import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';

export default function ParentPage() {
    const location = useLocation();
    const { pathname } = location
    let headerTitle = '';
    let headerDescription = '';
    let showEntityPills = false;

    switch (pathname) {
        case '/dashboard':
            headerTitle = 'Overview';
            headerDescription = 'Compliance monitoring across CK India, US, UK and Australia.';
            showEntityPills = true;
            break;
        case '/inbox':
            headerTitle = 'My Inbox';
            headerDescription = 'Action items assigned to you as Checker or Maker pool.';
            showEntityPills = true;
            break;
        case '/tasks':
            headerTitle = 'Task List';
            headerDescription = 'Compliance tasks assigned to your Maker/Checker pool.';
            showEntityPills = true;
            break;
        case '/sops':
            headerTitle = 'SOP Management';
            headerDescription = 'Standard operating procedures configured per corporate entity.';
            showEntityPills = true;
            break;
        case '/audit':
            headerTitle = 'Audit Trail';
            headerDescription = 'Immutable event log of all Maker/Checker actions for compliance & security verification.';
            showEntityPills = true;
            break;
        case '/access-control':
            headerTitle = 'Named Access Control Manager';
            headerDescription = 'Configure named user permissions for SOP creation, SOP approval, Task execution, and Task verification across process categories.';
            showEntityPills = false;
            break;
        case '/categories':
            headerTitle = 'Process Category Management';
            headerDescription = 'Define and manage operational categories used across SOP master definitions and compliance task workflows.';
            showEntityPills = false;
            break;
        default:
            break;
    }

    return (
        <>
            <div className="flex min-h-screen w-full">
                <Sidebar />
                <div className="flex-1 min-w-0">
                    <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
                        <Header title={headerTitle} description={headerDescription} showEntityPills={showEntityPills} />
                        <Outlet />
                    </main>
                </div>
            </div>
        </>
    )
}
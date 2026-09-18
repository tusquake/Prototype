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
        // case '/tasks':
        //     headerTitle = 'Task List';
        //     headerDescription = 'Compliance tasks assigned to your Maker/Checker pool.';
        //     showEntityPills = true;
        //     break;
        case '/sop-management':
            headerTitle = 'SOP Management';
            headerDescription = 'Manage and Configure Standard operating procedures.';
            showEntityPills = true;
            break;
        case '/sop-activity':
            headerTitle = 'SOP Activity';
            headerDescription = 'List of Standard operating procedures created.';
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
            <div className="flex h-screen w-full overflow-hidden bg-bg-base">

                {/* Sidebar handles its own collapsed state internally now */}
                <Sidebar />

                {/* 2. flex-1 makes this take ALL remaining width automatically */}
                {/* 3. overflow-y-auto allows only this content area to scroll */}
                <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
                    <main className="flex flex-col flex-1 min-w-0">
                        <Header
                            title={headerTitle}
                            description={headerDescription}
                            showEntityPills={showEntityPills}
                        />
                        <div className="flex-1 p-1"> {/* Add padding for your content if needed */}
                            <Outlet />
                        </div>
                    </main>
                </div>

            </div>
        </>
    )
}
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

export default function ParentPage() {
    return (
        <>
            <div className="flex min-h-screen w-full">
                <Sidebar />
                <div className="flex-1 min-w-0">
                    <Outlet />
                </div>
            </div>
        </>
    )
}
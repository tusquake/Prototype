import Pagination from "./Pagination";
import TableSkeleton from "./TableSkeleton";
import StatusBadge from "./StatusBadge";

const PAGE_SIZE = 5;

export default function TaskMakerCheckerTable({tableType="MAKER", tableHeading, tableHeadingSvg, totalTasks, tableHeaders, paginatedTasks, currentPage, setCurrentPage, loading, isAdmin, onReviewClick, onDeleteClick }) {
    return (
        <>
            <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] my-4">
                <div className="px-6 py-[18px] border-b border-[#f1f5f9] flex items-center justify-between bg-bg-surface">
                    <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
                        {tableHeadingSvg}
                        {tableHeading}
                    </span>
                    <span className="text-[12px] font-semibold text-text-muted bg-[#f1f5f9] px-[10px] py-[3px] rounded-[12px]">
                        {totalTasks.length} task{totalTasks.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[#f1f5f9]">
                                {tableHeaders?.map((header, idx) => {
                                    const isLast = idx === tableHeaders?.length - 1;
                                    return (
                                        <th key={idx} className={`px-6 py-3 ${isLast ? "text-right" : "text-left"} text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface`}>{header}</th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton rows={3} columns={8} />
                            ) : totalTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-12 text-[#94a3b8] text-[13.5px]">
                                        No pending approvals for selected entities.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTasks.map(task => {
                                    // const isActionedByOther = task.lockedChecker && !isUserMatch(task.lockedChecker) && userRole !== 'ADMIN';
                                    // const isSelfSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && userRole !== 'ADMIN';

                                    return (
                                        <tr key={task.id} className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]" onClick={()=>onReviewClick(task)}>
                                            <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{task.record}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{task.sop}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.entity}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.period}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{tableType === 'MAKER' ? task?.checker : task?.actualMaker}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{task.dueDate}</td>
                                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                                                <StatusBadge status={task.status} />
                                            </td>
                                            <td className="px-6 py-3.5 text-[13.5px] align-middle">
                                                <div className="flex gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1 px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(22,163,74,0.1)] text-[#16a34a] transition-opacity duration-150 hover:opacity-85"
                                                        onClick={()=>onReviewClick(task)}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                        Review
                                                    </button>

                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            className="inline-flex items-center gap-[5px] px-3.5 py-[6px] rounded-[6px] text-[12.5px] font-semibold border-none cursor-pointer bg-[rgba(220,38,38,0.1)] text-[#dc2626] transition-opacity duration-150 hover:opacity-85"
                                                            onClick={()=>onDeleteClick(task)}
                                                            title="Delete Task (Admin)"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalTasks.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        itemLabel={tableType === 'MAKERS' ? "tasks to complete" :"approval tasks" }
                    />
                )}
            </div>
        </>
    )
}
import EntityPills from './EntityPills';

export default function Header({ title, description, showEntityPills }) {
    return (
        <header className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
            <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
                <div>
                <h1 className="text-[22px] font-bold text-[#1e293b]">{title}</h1>
                <p className="text-[13.5px] text-text-muted mt-1">{description}</p>
                </div>
                {showEntityPills && <EntityPills />}
            </div>
        </header>
    );
}
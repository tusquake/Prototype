export default function Tooltip({name}){
    return (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-[60] mb-1.5 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <div className="whitespace-nowrap rounded bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-white shadow-md">
              {name}
            </div>
            {/* Downward pointing arrow */}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></div>
          </div>

    )
}
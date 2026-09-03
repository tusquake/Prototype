export default function TableSkeleton({ rows = 3, columns = 7 }) {
  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });

  return (
    <>
      {rowArray.map((_, rIdx) => (
        <tr key={rIdx} className="h-12">
          {colArray.map((_, cIdx) => (
            <td key={cIdx} className="px-4.5 py-3 align-middle">
              <span
                className={`shimmer h-4 ${cIdx === 0
                    ? 'w-[70%]'
                    : cIdx === 1
                      ? 'w-[90%]'
                      : cIdx === columns - 1
                        ? 'w-[50%]'
                        : 'w-[80%]'
                  }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

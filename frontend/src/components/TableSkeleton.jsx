export default function TableSkeleton({ rows = 3, columns = 7 }) {
  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });

  return (
    <>
      {rowArray.map((_, rIdx) => (
        <tr key={rIdx} style={{ height: '48px' }}>
          {colArray.map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '12px 18px', verticalAlign: 'middle' }}>
              <span
                className="shimmer"
                style={{
                  height: '16px',
                  width: cIdx === 0 ? '70%' : cIdx === 1 ? '90%' : cIdx === columns - 1 ? '50%' : '80%',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

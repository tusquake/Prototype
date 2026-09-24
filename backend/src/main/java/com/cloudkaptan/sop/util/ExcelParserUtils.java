package com.cloudkaptan.sop.util;

import org.apache.poi.ss.usermodel.*;

public class ExcelParserUtils {

    private static final DataFormatter FORMATTER = new DataFormatter();

    public static String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return FORMATTER.formatCellValue(cell).trim();
    }

    public static boolean isRowBlank(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellValueAsString(cell);
                if (!val.isBlank()) return false;
            }
        }
        return true;
    }
}

"use client";

function parseCsvRow(rowStr: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const c = rowStr[i];
    if (c === '"') {
      if (inQuotes && rowStr[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export function jsonToCsv(jsonStr: string): string {
  const data = JSON.parse(jsonStr);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return "";

  const headers = Array.from(new Set(arr.flatMap(Object.keys)));
  const rows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

  for (const obj of arr) {
    const row = headers.map((h) => {
      let val = (obj as any)[h];
      if (val === undefined || val === null) return '""';
      if (typeof val === "object") val = JSON.stringify(val);
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

export function csvToJson(csvStr: string): string {
  const lines = csvStr.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return "[]";

  const headers = parseCsvRow(lines[0]);
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    const obj: Record<string, any> = {};

    headers.forEach((h, idx) => {
      let val: any = values[idx] ?? "";
      if (typeof val === "string") {
        if (/^-?\d+(\.\d+)?$/.test(val.trim())) {
          val = Number(val.trim());
        } else if (val.toLowerCase() === "true") {
          val = true;
        } else if (val.toLowerCase() === "false") {
          val = false;
        }
      }
      obj[h] = val;
    });

    result.push(obj);
  }

  return JSON.stringify(result, null, 2);
}

export function jsonToYaml(jsonStr: string): string {
  const obj = JSON.parse(jsonStr);

  function stringify(val: any, indent: number = 0): string {
    const spaces = " ".repeat(indent);
    if (val === null || val === undefined) return "null";
    if (typeof val === "boolean" || typeof val === "number") return String(val);
    if (typeof val === "string") {
      return val.includes("\n") || val.includes(":") ? `"${val.replace(/"/g, '\\"')}"` : val;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      return val.map((item) => `${spaces}- ${stringify(item, indent + 2).trimStart()}`).join("\n");
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return "{}";
      return keys
        .map((k) => {
          const v = val[k];
          if (typeof v === "object" && v !== null && Object.keys(v).length > 0) {
            return `${spaces}${k}:\n${stringify(v, indent + 2)}`;
          }
          return `${spaces}${k}: ${stringify(v, indent + 2)}`;
        })
        .join("\n");
    }
    return String(val);
  }

  return stringify(obj, 0);
}

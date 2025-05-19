import { ParsedDiff, DiffLine } from "@/lib/types";
import { useMemo } from "react";

interface DiffViewerProps {
  diff: string;
}

export default function DiffViewer({ diff }: DiffViewerProps) {
  const parsedDiff = useMemo(() => parseDiff(diff), [diff]);

  const addedLines = parsedDiff.lines.filter(line => line.type === "added").length;
  const removedLines = parsedDiff.lines.filter(line => line.type === "removed").length;

  return (
    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-gray-50">
      <div className="text-xs font-semibold p-2 bg-gray-100 border-b border-gray-200">
        {parsedDiff.fileName} {" "}
        {addedLines > 0 && <span className="text-green-600">+{addedLines} lines</span>}
        {" "}
        {removedLines > 0 && <span className="text-red-600">-{removedLines} lines</span>}
      </div>
      <div className="p-0">
        {parsedDiff.lines.map((line, index) => (
          <pre key={index} className={`diff-line diff-${line.type}`}>{line.content}</pre>
        ))}
      </div>
    </div>
  );
}

function parseDiff(diff: string): ParsedDiff {
  const lines = diff.split("\n");
  let fileName = "unknown.file";
  
  // Try to extract file name from the diff header
  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      fileName = line.substring(6);
      break;
    }
  }
  
  // Parse lines
  const parsedLines: DiffLine[] = [];
  
  for (const line of lines) {
    if (line.startsWith("+++") || line.startsWith("---")) {
      // Skip diff header lines
      continue;
    } else if (line.startsWith("@@")) {
      // Header line
      parsedLines.push({
        type: "header",
        content: line
      });
    } else if (line.startsWith("+")) {
      // Added line
      parsedLines.push({
        type: "added",
        content: line
      });
    } else if (line.startsWith("-")) {
      // Removed line
      parsedLines.push({
        type: "removed",
        content: line
      });
    } else if (line.length > 0) {
      // Unchanged line, might start with a space
      parsedLines.push({
        type: "unchanged",
        content: line.startsWith(" ") ? line : " " + line
      });
    }
  }
  
  return {
    fileName,
    addedLines: parsedLines.filter(line => line.type === "added").length,
    removedLines: parsedLines.filter(line => line.type === "removed").length,
    lines: parsedLines
  };
}

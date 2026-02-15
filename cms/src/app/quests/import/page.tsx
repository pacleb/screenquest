"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface ParsedRow {
  name: string;
  description?: string;
  icon?: string;
  category: string;
  suggestedRewardSeconds: number;
  suggestedStackingType?: string;
  ageRange?: string;
}

interface ValidatedRow {
  data: ParsedRow;
  valid: boolean;
  errors: string[];
}

const CSV_TEMPLATE =
  "name,description,icon,category,suggestedRewardSeconds,suggestedStackingType,ageRange\nClean Your Room,Tidy up and make the bed,🛏️,Chores,900,stackable,all\nRead a Book,Read for at least 20 minutes,📚,Learning,1200,stackable,6-8";

export default function ImportPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quest-library-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateRow = (raw: Record<string, string>): ValidatedRow => {
    const errors: string[] = [];
    const name = raw.name?.trim();
    const category = raw.category?.trim();
    const reward = parseInt(raw.suggestedRewardSeconds);
    const stacking = raw.suggestedStackingType?.trim() || "stackable";

    if (!name) errors.push("Name is required");
    if (!category) errors.push("Category is required");
    if (!reward || reward < 60 || reward > 28800)
      errors.push("Reward must be 60-28800 seconds");
    if (!["stackable", "non_stackable"].includes(stacking))
      errors.push("Invalid stacking type");

    return {
      data: {
        name: name || "",
        description: raw.description?.trim(),
        icon: raw.icon?.trim(),
        category: category || "",
        suggestedRewardSeconds: reward || 0,
        suggestedStackingType: stacking,
        ageRange: raw.ageRange?.trim(),
      },
      valid: errors.length === 0,
      errors,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = (results.data as Record<string, string>[]).map(
          validateRow,
        );
        setRows(validated);
      },
      error: () => {
        toast("Failed to parse CSV", "error");
      },
    });
  };

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post("/admin/quest-library/bulk-import", {
        rows: validRows.map((r) => r.data),
      });
      setResult(res.data);
      toast(`Imported ${res.data.imported} quests!`, "success");
    } catch {
      toast("Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/quests"
          className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Quests</h1>
          <p className="text-sm text-gray-500">Bulk import from CSV</p>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Upload CSV File</h3>
              <p className="text-sm text-gray-500">
                Headers: name, description, icon, category,
                suggestedRewardSeconds, suggestedStackingType, ageRange
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-10 hover:border-brand-500 transition-colors"
          >
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              Click to upload CSV
            </p>
            <p className="text-xs text-gray-400">or drag and drop</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </Card>

      {/* Preview */}
      {rows.length > 0 && !result && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Preview</h3>
              <Badge variant="success">{validRows.length} valid</Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive">
                  {invalidRows.length} invalid
                </Badge>
              )}
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
            >
              {importing ? "Importing..." : `Import ${validRows.length} Quests`}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium w-8"></th>
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Reward</th>
                  <th className="pb-2 font-medium">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row.valid ? "" : "bg-red-50"}>
                    <td className="py-2 pr-4">
                      {row.valid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {row.data.icon && (
                        <span className="mr-1">{row.data.icon}</span>
                      )}
                      {row.data.name}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {row.data.category}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {Math.floor(row.data.suggestedRewardSeconds / 60)}m
                    </td>
                    <td className="py-2 text-red-600 text-xs">
                      {row.errors.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-gray-900">Import Complete</p>
              <p className="text-sm text-gray-500">
                {result.imported} quests imported as drafts.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/quests">
              <Button>View Quests</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setRows([]);
                setResult(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Import More
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

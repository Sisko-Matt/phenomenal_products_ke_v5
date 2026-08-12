import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export function TableDescriptionEditor({
  value,
  onChange,
}: {
  value: { key: string; value: string }[];
  onChange: (val: { key: string; value: string }[]) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  function add() {
    if (!newKey.trim() || !newValue.trim()) return;
    onChange([...value, { key: newKey.trim(), value: newValue.trim() }]);
    setNewKey("");
    setNewValue("");
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Specifications / Table Description
      </span>
      
      {value.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Attribute</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="w-10 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {value.map((item, i) => (
                <tr key={i} className="group">
                  <td className="px-4 py-2.5 font-medium">{item.key}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{item.value}</td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="rounded-full p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2">
        <input
          placeholder="Attribute (e.g. Size)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="input flex-1"
        />
        <input
          placeholder="Value (e.g. Large)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={add}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-gold-foreground hover:scale-105 transition-transform"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

import type { ChangeEvent } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  activeLine?: number | null;
  disabled?: boolean;
}

export function CodeEditor({
  code,
  onChange,
  activeLine = null,
  disabled = false,
}: CodeEditorProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section aria-label="C code editor">
      <header>
        <h2>Code</h2>

        {activeLine !== null && (
          <span>
            Current line: {activeLine}
          </span>
        )}
      </header>

      <textarea
        value={code}
        onChange={handleChange}
        disabled={disabled}
        spellCheck={false}
        aria-label="C source code"
        rows={18}
      />
    </section>
  );
}
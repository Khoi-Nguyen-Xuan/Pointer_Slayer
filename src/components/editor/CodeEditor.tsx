import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import type * as Monaco from "monaco-editor";

import "./CodeEditor.css";

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
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const updateActiveLine = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      activeLine === null
        ? []
        : [{
            range: {
              startLineNumber: activeLine,
              startColumn: 1,
              endLineNumber: activeLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: "code-editor-active-line",
            },
          }],
    );
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    updateActiveLine(editor);
  };

  useEffect(() => {
    const editor = editorRef.current;

    if (editor === null) {
      return;
    }

    updateActiveLine(editor);
  }, [activeLine]);

  return (
    <section className="code-editor" aria-label="C code editor">
      <header>
        <h2>Code</h2>
{/* 
        {activeLine !== null && (
          <span>
            Current line: {activeLine}
          </span>
        )} */}
      </header>

      <div className="code-editor-surface">
        <Editor
          height="100%"
          language="c"
          theme="vs-dark"
          value={code}
          onChange={(value) => onChange(value ?? "")}
          onMount={handleMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            readOnly: disabled,
            scrollBeyondLastLine: false,
            tabSize: 2,
          }}
        />
      </div>
    </section>
  );
}
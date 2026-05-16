import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import Editor from '@monaco-editor/react';
import { useDispatch, useSelector } from 'react-redux';
import { setCode } from '../store/interviewSlice';

const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  c: 'c',
};

const CodeEditor = forwardRef(({ language = 'javascript', readOnly = false }, ref) => {
  const dispatch = useDispatch();
  const code = useSelector((state) => state.interview.code);
  const editorRef = useRef(null);

  // Expose editor methods to parent component
  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (value) => editorRef.current?.setValue(value || ''),
    focus: () => editorRef.current?.focus(),
  }), []);

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleChange = useCallback(
    (value) => {
      if (!readOnly) {
        dispatch(setCode(value || ''));
      }
    },
    [dispatch, readOnly]
  );

  const monacoLang = LANGUAGE_MAP[language] || 'javascript';

  return (
    <div className="w-full h-full border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <span className="text-sm font-medium text-gray-300">
          {language.toUpperCase()}
        </span>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>
      <Editor
        height="100%"
        language={monacoLang}
        value={code}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          tabSize: language === 'python' ? 4 : 2,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          readOnly,
          padding: { top: 12 },
          renderLineHighlight: 'all',
          bracketPairColorization: { enabled: true },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';
export default CodeEditor;

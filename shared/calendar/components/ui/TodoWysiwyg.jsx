import React from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
});

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }], // 🔑 H1–H4 + Paragraph
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header",          // 🔑 REQUIRED
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
];

export function TodoWysiwyg({ value, onChange }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 6,
      }}
    >
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
      />
    </div>
  );
}

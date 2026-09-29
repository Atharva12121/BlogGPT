"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  ImageIcon,
  Quote,
  Code2,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from "@/lib/storage/constants";

const lowlight = createLowlight(common);

type Props = {
  content: string;
  onChange: (html: string) => void;
  className?: string;
};

export function RichTextEditor({ content, onChange, className }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: "Write your story..." }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] px-4 py-3 focus:outline-none prose-blog dark:prose-invert",
      },
    },
  });

  if (!editor) return <div className="h-80 animate-pulse rounded-lg bg-secondary" />;

  const setLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(`Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`);
        return;
      }
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok || !json.success) {
          toast.error(json.message || "Upload failed");
          return;
        }
        editor.chain().focus().setImage({ src: json.data.url }).run();
      } catch {
        toast.error("Unable to upload the image.");
      }
    };
    input.click();
  };

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), label: "Bold" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), label: "Italic" },
    {
      icon: UnderlineIcon,
      action: () => editor.chain().focus().toggleUnderline().run(),
      label: "Underline",
    },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), label: "Bullet list" },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      label: "Numbered list",
    },
    { icon: Link2, action: setLink, label: "Link" },
    { icon: ImageIcon, action: addImage, label: "Image" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), label: "Quote" },
    { icon: Code2, action: () => editor.chain().focus().toggleCodeBlock().run(), label: "Code block" },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), label: "Divider" },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), label: "Undo" },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), label: "Redo" },
  ];

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="flex flex-wrap gap-1 border-b p-2" role="toolbar" aria-label="Editor toolbar">
        {tools.map(({ icon: Icon, action, label }) => (
          <Button
            key={label}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={label}
            onClick={action}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

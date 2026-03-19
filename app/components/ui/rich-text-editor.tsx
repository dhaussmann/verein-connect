import { RichTextEditor as MantineRTE, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Heading from "@tiptap/extension-heading";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import type { ReactNode } from "react";

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string | number;
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder,
  className,
  minHeight = 200,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TextStyle,
      Color,
      Heading.configure({ levels: [1, 2, 3] }),
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      Link,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  return (
    <MantineRTE
      editor={editor}
      className={className}
      style={{ minHeight }}
    >
      <MantineRTE.Toolbar sticky stickyOffset={60}>
        <MantineRTE.ControlsGroup>
          <MantineRTE.Bold />
          <MantineRTE.Italic />
          <MantineRTE.Underline />
          <MantineRTE.Strikethrough />
        </MantineRTE.ControlsGroup>
        <MantineRTE.ControlsGroup>
          <MantineRTE.H1 />
          <MantineRTE.H2 />
          <MantineRTE.H3 />
        </MantineRTE.ControlsGroup>
        <MantineRTE.ControlsGroup>
          <MantineRTE.BulletList />
          <MantineRTE.OrderedList />
        </MantineRTE.ControlsGroup>
        <MantineRTE.ControlsGroup>
          <MantineRTE.Link />
          <MantineRTE.Unlink />
        </MantineRTE.ControlsGroup>
        <MantineRTE.ControlsGroup>
          <MantineRTE.AlignLeft />
          <MantineRTE.AlignCenter />
          <MantineRTE.AlignRight />
        </MantineRTE.ControlsGroup>
      </MantineRTE.Toolbar>
      <MantineRTE.Content />
    </MantineRTE>
  );
}

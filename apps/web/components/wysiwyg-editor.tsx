"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Minus,
	Quote,
	Redo,
	Strikethrough,
	Underline as UnderlineIcon,
	Undo,
	Unlink,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface WysiwygEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function WysiwygEditor({
	value,
	onChange,
	placeholder = "Start writing...",
	className,
}: WysiwygEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Underline,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Placeholder.configure({
				placeholder,
			}),
		],
		content: value,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none",
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value);
		}
	}, [value, editor]);

	if (!editor) {
		return (
			<div className={cn("rounded-md border bg-muted/30 animate-pulse h-[300px]", className)} />
		);
	}

	const setLink = () => {
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("URL", previousUrl);

		if (url === null) {
			return;
		}

		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};

	return (
		<div className={cn("rounded-md border bg-background", className)}>
			<div className="flex flex-wrap items-center gap-0.5 border-b p-2 bg-muted/30">
				<Toggle
					size="sm"
					pressed={editor.isActive("bold")}
					onPressedChange={() => editor.chain().focus().toggleBold().run()}
					aria-label="Bold"
				>
					<Bold className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("italic")}
					onPressedChange={() => editor.chain().focus().toggleItalic().run()}
					aria-label="Italic"
				>
					<Italic className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("underline")}
					onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
					aria-label="Underline"
				>
					<UnderlineIcon className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("strike")}
					onPressedChange={() => editor.chain().focus().toggleStrike().run()}
					aria-label="Strikethrough"
				>
					<Strikethrough className="h-4 w-4" />
				</Toggle>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<Toggle
					size="sm"
					pressed={editor.isActive("heading", { level: 1 })}
					onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					aria-label="Heading 1"
				>
					<Heading1 className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("heading", { level: 2 })}
					onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					aria-label="Heading 2"
				>
					<Heading2 className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("heading", { level: 3 })}
					onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					aria-label="Heading 3"
				>
					<Heading3 className="h-4 w-4" />
				</Toggle>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<Toggle
					size="sm"
					pressed={editor.isActive("bulletList")}
					onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
					aria-label="Bullet List"
				>
					<List className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("orderedList")}
					onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
					aria-label="Ordered List"
				>
					<ListOrdered className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("blockquote")}
					onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
					aria-label="Quote"
				>
					<Quote className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive("codeBlock")}
					onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
					aria-label="Code Block"
				>
					<Code className="h-4 w-4" />
				</Toggle>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<Toggle
					size="sm"
					pressed={editor.isActive({ textAlign: "left" })}
					onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
					aria-label="Align Left"
				>
					<AlignLeft className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive({ textAlign: "center" })}
					onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
					aria-label="Align Center"
				>
					<AlignCenter className="h-4 w-4" />
				</Toggle>
				<Toggle
					size="sm"
					pressed={editor.isActive({ textAlign: "right" })}
					onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
					aria-label="Align Right"
				>
					<AlignRight className="h-4 w-4" />
				</Toggle>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<Toggle
					size="sm"
					pressed={editor.isActive("link")}
					onPressedChange={setLink}
					aria-label="Link"
				>
					<LinkIcon className="h-4 w-4" />
				</Toggle>
				{editor.isActive("link") && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => editor.chain().focus().unsetLink().run()}
						className="h-8 px-2"
					>
						<Unlink className="h-4 w-4" />
					</Button>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => editor.chain().focus().setHorizontalRule().run()}
					className="h-8 px-2"
				>
					<Minus className="h-4 w-4" />
				</Button>

				<Separator orientation="vertical" className="mx-1 h-6" />

				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					className="h-8 px-2"
				>
					<Undo className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					className="h-8 px-2"
				>
					<Redo className="h-4 w-4" />
				</Button>
			</div>

			<EditorContent editor={editor} />
		</div>
	);
}
